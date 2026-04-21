const oiocClient = require('../clients/oioc');
const youzanClient = require('../clients/youzan');
const { SyncLog, ProductMapping } = require('../models');
const logger = require('../utils/logger');

const PROCESSING_TIMEOUT_MS = 60 * 1000;

class SyncService {
  constructor() {
    this.oiocClient = oiocClient;
    this.youzanClient = youzanClient;
  }

  getBeijingTime() {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return beijingTime.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  }

  async logSync(type, data, status, error = null, idempotencyKey = null) {
    const timestamp = this.getBeijingTime();
    
    logger.info(`[${type}] ${status}`, { type, status, data, error: error?.message });
    
    try {
      await SyncLog.create({
        type,
        status,
        data,
        error: error ? error.message : null,
        timestamp: timestamp,
        idempotencyKey
      });
    } catch (err) {
      logger.error('写入日志数据库失败', { error: err.message });
    }
  }

  async checkIdempotency(idempotencyKey) {
    const result = await SyncLog.addIdempotencyCheck(idempotencyKey);
    
    if (!result.exists) {
      return { canProceed: true, reason: 'new_request' };
    }
    
    if (result.status === 'success') {
      return { canProceed: false, reason: 'already_processed' };
    }
    
    if (result.status === 'failed') {
      return { canProceed: true, reason: 'retry_after_failure' };
    }
    
    if (result.status === 'processing') {
      const recordTime = new Date(result.record.timestamp.replace(' ', 'T') + 'Z').getTime();
      const now = Date.now();
      const elapsed = now - recordTime;
      
      if (elapsed > PROCESSING_TIMEOUT_MS) {
        return { canProceed: true, reason: 'processing_timeout' };
      }
      
      return { canProceed: false, reason: 'processing' };
    }
    
    return { canProceed: true, reason: 'unknown_status' };
  }

  async handleInbound(inboundData) {
    logger.info('====================================');
    logger.info('流程1: 商品采购入库');
    logger.info('====================================');
    
    const { orderNo } = inboundData;
    const idempotencyKey = orderNo ? `inbound_${orderNo}` : null;
    
    try {
      const { productId, itemId, skuId, quantity, codes, receiverID } = inboundData;
      
      logger.info('接收入库数据', {
        productId,
        itemId,
        skuId,
        quantity,
        codesCount: codes ? codes.length : 0,
      });
      
      if (!itemId || !quantity) {
        throw new Error('缺少必需参数: itemId 或 quantity');
      }
      
      if (idempotencyKey) {
        const idempotencyResult = await this.checkIdempotency(idempotencyKey);
        
        if (!idempotencyResult.canProceed) {
          logger.warn(`幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { itemId, skuId, quantity },
          };
        }
        
        logger.debug(`幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      logger.info('登录第三方系统...');
      const loginResult = await this.oiocClient.login();
      
      if (!loginResult || !loginResult.token) {
        throw new Error('第三方系统登录失败：未返回token');
      }
      logger.info('登录成功，Token已获取');
      
      if (productId && codes && codes.length > 0) {
        logger.info('在第三方系统创建入库单...');
        const inboundOrder = await this.oiocClient.createInboundOrder({
          orderNumber: `IN${Date.now()}`,
          receiverID: receiverID || '',
          detailList: [{
            productID: productId,
            expectedQty: quantity,
          }],
        });
        logger.info('入库单创建成功', { inboundOrder });
      }
      
      logger.info('更新有赞库存...');
      await this.youzanClient.addStock(itemId, skuId || '', quantity);
      logger.info(`有赞库存已增加 ${quantity} 件`, { itemId, skuId, quantity });
      
      if (productId && itemId) {
        logger.info('保存产品映射关系...');
        await this.saveProductMapping({
          youzanItemId: itemId,
          youzanSkuId: skuId || '',
          oiocProductCode: productId,
        });
      }
      
      await this.logSync('inbound', inboundData, 'success', null, idempotencyKey);
      
      logger.info('入库流程完成');
      
      return {
        success: true,
        message: '入库同步成功',
        data: { itemId, skuId, quantity },
      };
    } catch (error) {
      logger.error('入库同步失败', { error: error.message, stack: error.stack });
      await this.logSync('inbound', inboundData, 'failed', error, idempotencyKey);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async handleOrderCreated(orderData) {
    logger.info('====================================');
    logger.info('流程2: 销售发货 - 订单创建');
    logger.info('====================================');
    
    const { orderId, tid } = orderData;
    const orderKey = tid || orderId;
    const idempotencyKey = orderKey ? `order_created_${orderKey}` : null;
    
    try {
      logger.info('接收订单数据', { orderId, tid });
      
      if (!orderId && !tid) {
        throw new Error('缺少必需参数: orderId 或 tid');
      }
      
      if (idempotencyKey) {
        const idempotencyResult = await this.checkIdempotency(idempotencyKey);
        
        if (!idempotencyResult.canProceed) {
          logger.warn(`幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { orderId },
          };
        }
        
        logger.debug(`幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      logger.info('获取有赞订单详情...');
      const orderDetail = await this.youzanClient.getOrder(orderId);
      logger.info('订单详情获取成功');
      
      const { trade } = orderDetail;
      if (!trade) {
        throw new Error('订单详情格式错误');
      }
      
      const items = trade.orders || [];
      const address = {
        name: trade.receiver_name,
        phone: trade.receiver_mobile,
        province: trade.receiver_state,
        city: trade.receiver_city,
        district: trade.receiver_district,
        address: trade.receiver_address,
      };
      
      logger.info('订单商品信息', { itemsCount: items.length, address: `${address.province} ${address.city} ${address.district}` });
      
      const detailList = [];
      for (const item of items) {
        const mapping = await this.getProductMapping({ youzanItemId: item.item_id });
        if (mapping) {
          detailList.push({
            productID: mapping.oiocProductCode,
            expectedQty: item.num,
          });
          logger.debug(`商品映射: 有赞 ${item.item_id} -> 第三方 ${mapping.oiocProductCode}`);
        } else {
          logger.warn(`未找到商品映射: 有赞 ${item.item_id}，使用原始ID`);
          detailList.push({
            productID: item.item_id,
            expectedQty: item.num,
          });
        }
      }
      
      logger.info('登录第三方系统...');
      const loginResult = await this.oiocClient.login();
      
      if (!loginResult || !loginResult.token) {
        throw new Error('第三方系统登录失败：未返回token');
      }
      logger.info('登录成功，Token已获取');
      
      logger.info('在第三方系统创建出库单...');
      const outboundOrder = await this.oiocClient.createOutboundOrder({
        orderNumber: orderId,
        receiverID: trade.receiver_mobile || '',
        detailList: detailList,
      });
      logger.info('出库单创建成功', { outboundOrder });
      
      await this.logSync('order_created', orderData, 'success', null, idempotencyKey);
      
      logger.info('订单创建流程完成');
      
      return {
        success: true,
        message: '出库单创建成功',
        data: { orderId, outboundOrder },
      };
    } catch (error) {
      logger.error('创建出库单失败', { error: error.message, stack: error.stack });
      await this.logSync('order_created', orderData, 'failed', error, idempotencyKey);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async handleOutbound(outboundData) {
    logger.info('====================================');
    logger.info('流程2: 销售发货 - 出库发货');
    logger.info('====================================');
    
    const { orderNo, orderId } = outboundData;
    const orderKey = orderNo || orderId;
    const idempotencyKey = orderKey ? `outbound_${orderKey}` : null;
    
    try {
      const { logisticsNo, codes, itemId, skuId } = outboundData;
      
      logger.info('接收出库数据', {
        orderId,
        orderNo,
        logisticsNo,
        codesCount: codes ? codes.length : 0,
      });
      
      if (!orderKey || !codes || codes.length === 0) {
        throw new Error('缺少必需参数: orderId/orderNo 或 codes');
      }
      
      if (idempotencyKey) {
        const idempotencyResult = await this.checkIdempotency(idempotencyKey);
        
        if (!idempotencyResult.canProceed) {
          logger.warn(`幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { orderId, logisticsNo, codes },
          };
        }
        
        logger.debug(`幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      logger.info('扣减有赞库存...');
      const quantity = codes.length;
      
      let targetItemId = itemId;
      let targetSkuId = skuId;
      
      if (!targetItemId && codes.length > 0) {
        const firstCode = codes[0];
        const productCode = firstCode.productCode || firstCode.productId;
        if (productCode) {
          const mapping = await this.getProductMapping({ oiocProductCode: productCode });
          if (mapping) {
            targetItemId = mapping.youzanItemId;
            targetSkuId = mapping.youzanSkuId;
            logger.debug(`通过映射找到有赞商品: 第三方 ${productCode} -> 有赞 ${targetItemId}`);
          } else {
            logger.warn(`未找到产品映射: 第三方产品编码 ${productCode}`);
          }
        }
      }
      
      if (targetItemId) {
        await this.youzanClient.subtractStock(targetItemId, targetSkuId || '', quantity);
        logger.info(`有赞库存已扣减 ${quantity} 件`, { targetItemId, targetSkuId, quantity });
      } else {
        logger.warn('未找到itemId，跳过库存扣减');
      }
      
      logger.info('有赞订单发货...');
      await this.youzanClient.shipOrder(orderId, {
        out_stype: '1',
        out_sid: logisticsNo || '',
      });
      logger.info('订单已标记为已发货');
      
      logger.info('更新订单备注...');
      const remark = `防伪码: ${codes.map(c => c.code || c).join(', ')}`;
      await this.youzanClient.updateOrderRemark(orderId, remark);
      logger.info('防伪码已写入订单备注', { codes: codes.map(c => c.code || c) });
      
      await this.logSync('outbound', outboundData, 'success', null, idempotencyKey);
      
      logger.info('出库发货流程完成');
      
      return {
        success: true,
        message: '发货同步成功',
        data: { orderId, logisticsNo, codes },
      };
    } catch (error) {
      logger.error('出库同步失败', { error: error.message, stack: error.stack });
      await this.logSync('outbound', outboundData, 'failed', error, idempotencyKey);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async handleRefund(refundData) {
    logger.info('====================================');
    logger.info('流程3: 退货退款 - 创建退货单');
    logger.info('====================================');
    
    const { refundId, orderId } = refundData;
    const idempotencyKey = refundId ? `refund_${refundId}` : (orderId ? `refund_${orderId}` : null);
    
    try {
      const { items, receiverID } = refundData;
      
      logger.info('接收退货申请', { orderId, refundId, itemsCount: items ? items.length : 0 });
      
      if (!orderId && !refundId) {
        throw new Error('缺少必需参数: orderId 或 refundId');
      }
      
      if (idempotencyKey) {
        const idempotencyResult = await this.checkIdempotency(idempotencyKey);
        
        if (!idempotencyResult.canProceed) {
          logger.warn(`幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { orderId, refundId },
          };
        }
        
        logger.debug(`幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      logger.info('登录第三方系统...');
      const loginResult = await this.oiocClient.login();
      
      if (!loginResult || !loginResult.token) {
        throw new Error('第三方系统登录失败：未返回token');
      }
      logger.info('登录成功，Token已获取');
      
      logger.info('在第三方系统创建退货单...');
      const returnOrder = await this.oiocClient.createReturnOrder({
        orderNumber: `RETURN${Date.now()}`,
        receiverID: receiverID || '',
        detailList: items || [],
      });
      logger.info('退货单创建成功', { returnOrder });
      
      await this.logSync('refund_created', refundData, 'success', null, idempotencyKey);
      
      logger.info('退货单创建流程完成');
      
      return {
        success: true,
        message: '退货单创建成功',
        data: { orderId, refundId, returnOrder },
      };
    } catch (error) {
      logger.error('创建退货单失败', { error: error.message, stack: error.stack });
      await this.logSync('refund_created', refundData, 'failed', error, idempotencyKey);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async handleReturnComplete(returnData) {
    logger.info('====================================');
    logger.info('流程3: 退货退款 - 退货完成');
    logger.info('====================================');
    
    const { orderNo, orderId } = returnData;
    const orderKey = orderNo || orderId;
    const idempotencyKey = orderKey ? `return_${orderKey}` : null;
    
    try {
      const { codes, itemId, skuId } = returnData;
      
      logger.info('接收退货完成数据', {
        orderId,
        orderNo,
        codesCount: codes ? codes.length : 0,
      });
      
      if (!codes || codes.length === 0) {
        throw new Error('缺少必需参数: codes');
      }
      
      if (idempotencyKey) {
        const idempotencyResult = await this.checkIdempotency(idempotencyKey);
        
        if (!idempotencyResult.canProceed) {
          logger.warn(`幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { orderId, codes },
          };
        }
        
        logger.debug(`幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      logger.info('恢复有赞库存...');
      const quantity = codes.length;
      
      let targetItemId = itemId;
      let targetSkuId = skuId;
      
      if (!targetItemId && codes.length > 0) {
        const firstCode = codes[0];
        const productCode = firstCode.productCode || firstCode.productId;
        if (productCode) {
          const mapping = await this.getProductMapping({ oiocProductCode: productCode });
          if (mapping) {
            targetItemId = mapping.youzanItemId;
            targetSkuId = mapping.youzanSkuId;
            logger.debug(`通过映射找到有赞商品: 第三方 ${productCode} -> 有赞 ${targetItemId}`);
          } else {
            logger.warn(`未找到产品映射: 第三方产品编码 ${productCode}`);
          }
        }
      }
      
      if (targetItemId) {
        await this.youzanClient.addStock(targetItemId, targetSkuId || '', quantity);
        logger.info(`有赞库存已恢复 ${quantity} 件`, { targetItemId, targetSkuId, quantity });
      } else {
        logger.warn('未找到itemId，跳过库存恢复');
      }
      
      await this.logSync('return_complete', returnData, 'success', null, idempotencyKey);
      
      logger.info('退货完成流程完成');
      
      return {
        success: true,
        message: '退货库存恢复成功',
        data: { orderId, codes },
      };
    } catch (error) {
      logger.error('退货库存恢复失败', { error: error.message, stack: error.stack });
      await this.logSync('return_complete', returnData, 'failed', error, idempotencyKey);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getProductMapping(options) {
    try {
      if (options.youzanSkuId) {
        return await ProductMapping.findByYouzanSku(options.youzanSkuId);
      }
      if (options.youzanItemId) {
        return await ProductMapping.findByYouzanItem(options.youzanItemId);
      }
      if (options.oiocProductCode) {
        return await ProductMapping.findByOiocCode(options.oiocProductCode);
      }
      logger.warn('getProductMapping: 缺少查询参数');
      return null;
    } catch (error) {
      logger.error('查询产品映射失败', { error: error.message });
      return null;
    }
  }

  async saveProductMapping(mappingData) {
    try {
      const mapping = await ProductMapping.upsertByYouzanSku(mappingData);
      logger.info('产品映射保存成功', {
        youzanSkuId: mapping.youzanSkuId,
        oiocProductCode: mapping.oiocProductCode
      });
      return mapping;
    } catch (error) {
      logger.error('保存产品映射失败', { error: error.message });
      return null;
    }
  }
}

module.exports = new SyncService();
