const oiocClient = require('../clients/oioc');
const youzanClient = require('../clients/youzan');
const { SyncLog, ProductMapping } = require('../models');

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
    
    console.log(`[${timestamp}] ${type} - ${status}`, data, error || '');
    
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
      console.error('写入日志数据库失败:', err);
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
    console.log('\n====================================');
    console.log('流程1: 商品采购入库');
    console.log('====================================');
    
    const { orderNo } = inboundData;
    const idempotencyKey = orderNo ? `inbound_${orderNo}` : null;
    
    try {
      const { productId, itemId, skuId, quantity, codes, receiverID } = inboundData;
      
      console.log('📦 接收入库数据:', {
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
          console.log(`⚠️  幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { itemId, skuId, quantity },
          };
        }
        
        console.log(`✅ 幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      console.log('🔐 登录第三方系统...');
      const loginResult = await this.oiocClient.login();
      
      if (!loginResult || !loginResult.token) {
        throw new Error('第三方系统登录失败：未返回token');
      }
      console.log('✅ 登录成功，Token已获取');
      
      if (productId && codes && codes.length > 0) {
        console.log('📝 在第三方系统创建入库单...');
        const inboundOrder = await this.oiocClient.createInboundOrder({
          orderNumber: `IN${Date.now()}`,
          receiverID: receiverID || '',
          detailList: [{
            productID: productId,
            expectedQty: quantity,
          }],
        });
        console.log('✅ 入库单创建成功:', inboundOrder);
      }
      
      console.log('📊 更新有赞库存...');
      await this.youzanClient.addStock(itemId, skuId || '', quantity);
      console.log(`✅ 有赞库存已增加 ${quantity} 件`);
      
      if (productId && itemId) {
        console.log('📝 保存产品映射关系...');
        await this.saveProductMapping({
          youzanItemId: itemId,
          youzanSkuId: skuId || '',
          oiocProductCode: productId,
        });
      }
      
      await this.logSync('inbound', inboundData, 'success', null, idempotencyKey);
      
      console.log('🎉 入库流程完成\n');
      
      return {
        success: true,
        message: '入库同步成功',
        data: { itemId, skuId, quantity },
      };
    } catch (error) {
      console.error('❌ 入库同步失败:', error.message);
      await this.logSync('inbound', inboundData, 'failed', error, idempotencyKey);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async handleOrderCreated(orderData) {
    console.log('\n====================================');
    console.log('流程2: 销售发货 - 订单创建');
    console.log('====================================');
    
    const { orderId, tid } = orderData;
    const orderKey = tid || orderId;
    const idempotencyKey = orderKey ? `order_created_${orderKey}` : null;
    
    try {
      console.log('🛒 接收订单数据:', { orderId, tid });
      
      if (!orderId && !tid) {
        throw new Error('缺少必需参数: orderId 或 tid');
      }
      
      if (idempotencyKey) {
        const idempotencyResult = await this.checkIdempotency(idempotencyKey);
        
        if (!idempotencyResult.canProceed) {
          console.log(`⚠️  幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { orderId },
          };
        }
        
        console.log(`✅ 幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      console.log('📋 获取有赞订单详情...');
      const orderDetail = await this.youzanClient.getOrder(orderId);
      console.log('✅ 订单详情获取成功');
      
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
      
      console.log('📦 订单商品数量:', items.length);
      console.log('📍 收货地址:', address.province, address.city, address.district);
      
      const detailList = [];
      for (const item of items) {
        const mapping = await this.getProductMapping({ youzanItemId: item.item_id });
        if (mapping) {
          detailList.push({
            productID: mapping.oiocProductCode,
            expectedQty: item.num,
          });
          console.log(`📋 商品映射: 有赞 ${item.item_id} -> 第三方 ${mapping.oiocProductCode}`);
        } else {
          console.warn(`⚠️  未找到商品映射: 有赞 ${item.item_id}，使用原始ID`);
          detailList.push({
            productID: item.item_id,
            expectedQty: item.num,
          });
        }
      }
      
      console.log('🔐 登录第三方系统...');
      const loginResult = await this.oiocClient.login();
      
      if (!loginResult || !loginResult.token) {
        throw new Error('第三方系统登录失败：未返回token');
      }
      console.log('✅ 登录成功，Token已获取');
      
      console.log('📝 在第三方系统创建出库单...');
      const outboundOrder = await this.oiocClient.createOutboundOrder({
        orderNumber: orderId,
        receiverID: trade.receiver_mobile || '',
        detailList: detailList,
      });
      console.log('✅ 出库单创建成功:', outboundOrder);
      
      await this.logSync('order_created', orderData, 'success', null, idempotencyKey);
      
      console.log('🎉 订单创建流程完成\n');
      
      return {
        success: true,
        message: '出库单创建成功',
        data: { orderId, outboundOrder },
      };
    } catch (error) {
      console.error('❌ 创建出库单失败:', error.message);
      await this.logSync('order_created', orderData, 'failed', error, idempotencyKey);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async handleOutbound(outboundData) {
    console.log('\n====================================');
    console.log('流程2: 销售发货 - 出库发货');
    console.log('====================================');
    
    const { orderNo, orderId } = outboundData;
    const orderKey = orderNo || orderId;
    const idempotencyKey = orderKey ? `outbound_${orderKey}` : null;
    
    try {
      const { logisticsNo, codes, itemId, skuId } = outboundData;
      
      console.log('📦 接收出库数据:', {
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
          console.log(`⚠️  幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { orderId, logisticsNo, codes },
          };
        }
        
        console.log(`✅ 幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      console.log('📊 扣减有赞库存...');
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
            console.log(`📋 通过映射找到有赞商品: 第三方 ${productCode} -> 有赞 ${targetItemId}`);
          } else {
            console.warn(`⚠️  未找到产品映射: 第三方产品编码 ${productCode}`);
          }
        }
      }
      
      if (targetItemId) {
        await this.youzanClient.subtractStock(targetItemId, targetSkuId || '', quantity);
        console.log(`✅ 有赞库存已扣减 ${quantity} 件`);
      } else {
        console.log('⚠️  未找到itemId，跳过库存扣减');
      }
      
      console.log('🚚 有赞订单发货...');
      await this.youzanClient.shipOrder(orderId, {
        out_stype: '1',
        out_sid: logisticsNo || '',
      });
      console.log('✅ 订单已标记为已发货');
      
      console.log('📝 更新订单备注...');
      const remark = `防伪码: ${codes.map(c => c.code || c).join(', ')}`;
      await this.youzanClient.updateOrderRemark(orderId, remark);
      console.log('✅ 防伪码已写入订单备注');
      console.log('🏷️  防伪码:', codes.map(c => c.code || c).join(', '));
      
      await this.logSync('outbound', outboundData, 'success', null, idempotencyKey);
      
      console.log('🎉 出库发货流程完成\n');
      
      return {
        success: true,
        message: '发货同步成功',
        data: { orderId, logisticsNo, codes },
      };
    } catch (error) {
      console.error('❌ 出库同步失败:', error.message);
      await this.logSync('outbound', outboundData, 'failed', error, idempotencyKey);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async handleRefund(refundData) {
    console.log('\n====================================');
    console.log('流程3: 退货退款 - 创建退货单');
    console.log('====================================');
    
    const { refundId, orderId } = refundData;
    const idempotencyKey = refundId ? `refund_${refundId}` : (orderId ? `refund_${orderId}` : null);
    
    try {
      const { items, receiverID } = refundData;
      
      console.log('📦 接收退货申请:', { orderId, refundId, itemsCount: items ? items.length : 0 });
      
      if (!orderId && !refundId) {
        throw new Error('缺少必需参数: orderId 或 refundId');
      }
      
      if (idempotencyKey) {
        const idempotencyResult = await this.checkIdempotency(idempotencyKey);
        
        if (!idempotencyResult.canProceed) {
          console.log(`⚠️  幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { orderId, refundId },
          };
        }
        
        console.log(`✅ 幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      console.log('🔐 登录第三方系统...');
      const loginResult = await this.oiocClient.login();
      
      if (!loginResult || !loginResult.token) {
        throw new Error('第三方系统登录失败：未返回token');
      }
      console.log('✅ 登录成功，Token已获取');
      
      console.log('📝 在第三方系统创建退货单...');
      const returnOrder = await this.oiocClient.createReturnOrder({
        orderNumber: `RETURN${Date.now()}`,
        receiverID: receiverID || '',
        detailList: items || [],
      });
      console.log('✅ 退货单创建成功:', returnOrder);
      
      await this.logSync('refund_created', refundData, 'success', null, idempotencyKey);
      
      console.log('🎉 退货单创建流程完成\n');
      
      return {
        success: true,
        message: '退货单创建成功',
        data: { orderId, refundId, returnOrder },
      };
    } catch (error) {
      console.error('❌ 创建退货单失败:', error.message);
      await this.logSync('refund_created', refundData, 'failed', error, idempotencyKey);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async handleReturnComplete(returnData) {
    console.log('\n====================================');
    console.log('流程3: 退货退款 - 退货完成');
    console.log('====================================');
    
    const { orderNo, orderId } = returnData;
    const orderKey = orderNo || orderId;
    const idempotencyKey = orderKey ? `return_${orderKey}` : null;
    
    try {
      const { codes, itemId, skuId } = returnData;
      
      console.log('📦 接收退货完成数据:', {
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
          console.log(`⚠️  幂等性检查: ${idempotencyResult.reason}，跳过处理`);
          return {
            success: true,
            message: `已处理，跳过重复请求 (${idempotencyResult.reason})`,
            data: { orderId, codes },
          };
        }
        
        console.log(`✅ 幂等性检查通过: ${idempotencyResult.reason}`);
      }
      
      console.log('📊 恢复有赞库存...');
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
            console.log(`📋 通过映射找到有赞商品: 第三方 ${productCode} -> 有赞 ${targetItemId}`);
          } else {
            console.warn(`⚠️  未找到产品映射: 第三方产品编码 ${productCode}`);
          }
        }
      }
      
      if (targetItemId) {
        await this.youzanClient.addStock(targetItemId, targetSkuId || '', quantity);
        console.log(`✅ 有赞库存已恢复 ${quantity} 件`);
      } else {
        console.log('⚠️  未找到itemId，跳过库存恢复');
      }
      
      await this.logSync('return_complete', returnData, 'success', null, idempotencyKey);
      
      console.log('🎉 退货完成流程完成\n');
      
      return {
        success: true,
        message: '退货库存恢复成功',
        data: { orderId, codes },
      };
    } catch (error) {
      console.error('❌ 退货库存恢复失败:', error.message);
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
      console.warn('⚠️  getProductMapping: 缺少查询参数');
      return null;
    } catch (error) {
      console.error('查询产品映射失败:', error.message);
      return null;
    }
  }

  async saveProductMapping(mappingData) {
    try {
      const mapping = await ProductMapping.upsertByYouzanSku(mappingData);
      console.log('✅ 产品映射保存成功:', {
        youzanSkuId: mapping.youzanSkuId,
        oiocProductCode: mapping.oiocProductCode
      });
      return mapping;
    } catch (error) {
      console.error('保存产品映射失败:', error.message);
      return null;
    }
  }
}

module.exports = new SyncService();
