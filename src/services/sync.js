const oiocClient = require('../clients/oioc');
const youzanClient = require('../clients/youzan');
const { SyncLog } = require('../models');

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

  async logSync(type, data, status, error = null) {
    const timestamp = this.getBeijingTime();
    
    console.log(`[${timestamp}] ${type} - ${status}`, data, error || '');
    
    try {
      await SyncLog.create({
        type,
        status,
        data,
        error: error ? error.message : null,
        timestamp: timestamp
      });
    } catch (err) {
      console.error('写入日志数据库失败:', err);
    }
  }

  async handleInbound(inboundData) {
    console.log('\n====================================');
    console.log('流程1: 商品采购入库');
    console.log('====================================');
    
    try {
      const { productId, itemId, skuId, quantity, codes, receiverID } = inboundData;
      
      console.log('📦 接收入库数据:', {
        productId,
        itemId,
        skuId,
        quantity,
        codesCount: codes ? codes.length : 0,
      });
      
      // 1. 验证数据
      if (!itemId || !quantity) {
        throw new Error('缺少必需参数: itemId 或 quantity');
      }
      
      // 2. 登录第三方系统
      console.log('🔐 登录第三方系统...');
      const loginResult = await this.oiocClient.login();
      
      // 验证登录是否成功
      if (!loginResult || !loginResult.token) {
        throw new Error('第三方系统登录失败：未返回token');
      }
      console.log('✅ 登录成功，Token已获取');
      
      // 3. 在第三方系统创建入库单（如果提供了productId和codes）
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
      
      // 4. 更新有赞库存
      console.log('📊 更新有赞库存...');
      await this.youzanClient.addStock(itemId, skuId || '', quantity);
      console.log(`✅ 有赞库存已增加 ${quantity} 件`);
      
      // 5. 记录日志
      await this.logSync('inbound', inboundData, 'success');
      
      console.log('🎉 入库流程完成\n');
      
      return {
        success: true,
        message: '入库同步成功',
        data: { itemId, skuId, quantity },
      };
    } catch (error) {
      console.error('❌ 入库同步失败:', error.message);
      await this.logSync('inbound', inboundData, 'failed', error);
      
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
    
    try {
      const { orderId } = orderData;
      
      console.log('🛒 接收订单数据:', { orderId });
      
      // 1. 验证数据
      if (!orderId) {
        throw new Error('缺少必需参数: orderId');
      }
      
      // 2. 获取有赞订单详情
      console.log('📋 获取有赞订单详情...');
      const orderDetail = await this.youzanClient.getOrder(orderId);
      console.log('✅ 订单详情获取成功');
      
      // 3. 提取订单信息
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
      
      // 4. 登录第三方系统
      console.log('🔐 登录第三方系统...');
      const loginResult = await this.oiocClient.login();
      
      // 验证登录是否成功
      if (!loginResult || !loginResult.token) {
        throw new Error('第三方系统登录失败：未返回token');
      }
      console.log('✅ 登录成功，Token已获取');
      
      // 5. 在第三方系统创建出库单
      console.log('📝 在第三方系统创建出库单...');
      const outboundOrder = await this.oiocClient.createOutboundOrder({
        orderNumber: orderId,
        receiverID: trade.receiver_mobile || '',
        detailList: items.map(item => ({
          productID: item.item_id,
          expectedQty: item.num,
        })),
      });
      console.log('✅ 出库单创建成功:', outboundOrder);
      
      // 6. 记录日志
      await this.logSync('order_created', orderData, 'success');
      
      console.log('🎉 订单创建流程完成\n');
      
      return {
        success: true,
        message: '出库单创建成功',
        data: { orderId, outboundOrder },
      };
    } catch (error) {
      console.error('❌ 创建出库单失败:', error.message);
      await this.logSync('order_created', orderData, 'failed', error);
      
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
    
    try {
      const { orderId, logisticsNo, codes, itemId, skuId } = outboundData;
      
      console.log('📦 接收出库数据:', {
        orderId,
        logisticsNo,
        codesCount: codes ? codes.length : 0,
      });
      
      // 1. 验证数据
      if (!orderId || !codes || codes.length === 0) {
        throw new Error('缺少必需参数: orderId 或 codes');
      }
      
      // 2. 扣减有赞库存
      console.log('📊 扣减有赞库存...');
      const quantity = codes.length;
      if (itemId) {
        await this.youzanClient.subtractStock(itemId, skuId || '', quantity);
        console.log(`✅ 有赞库存已扣减 ${quantity} 件`);
      } else {
        console.log('⚠️  未提供itemId，跳过库存扣减');
      }
      
      // 3. 有赞订单发货
      console.log('🚚 有赞订单发货...');
      await this.youzanClient.shipOrder(orderId, {
        out_stype: '1',
        out_sid: logisticsNo || '',
      });
      console.log('✅ 订单已标记为已发货');
      
      // 4. 更新订单备注（写入防伪码）
      console.log('📝 更新订单备注...');
      const remark = `防伪码: ${codes.map(c => c.code || c).join(', ')}`;
      await this.youzanClient.updateOrderRemark(orderId, remark);
      console.log('✅ 防伪码已写入订单备注');
      console.log('🏷️  防伪码:', codes.map(c => c.code || c).join(', '));
      
      // 5. 记录日志
      await this.logSync('outbound', outboundData, 'success');
      
      console.log('🎉 出库发货流程完成\n');
      
      return {
        success: true,
        message: '发货同步成功',
        data: { orderId, logisticsNo, codes },
      };
    } catch (error) {
      console.error('❌ 出库同步失败:', error.message);
      await this.logSync('outbound', outboundData, 'failed', error);
      
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
    
    try {
      const { orderId, refundId, items, receiverID } = refundData;
      
      console.log('📦 接收退货申请:', { orderId, refundId, itemsCount: items ? items.length : 0 });
      
      // 1. 验证数据
      if (!orderId) {
        throw new Error('缺少必需参数: orderId');
      }
      
      // 2. 登录第三方系统
      console.log('🔐 登录第三方系统...');
      const loginResult = await this.oiocClient.login();
      
      // 验证登录是否成功
      if (!loginResult || !loginResult.token) {
        throw new Error('第三方系统登录失败：未返回token');
      }
      console.log('✅ 登录成功，Token已获取');
      
      // 3. 在第三方系统创建退货单
      console.log('📝 在第三方系统创建退货单...');
      const returnOrder = await this.oiocClient.createReturnOrder({
        orderNumber: `RETURN${Date.now()}`,
        receiverID: receiverID || '',
        detailList: items || [],
      });
      console.log('✅ 退货单创建成功:', returnOrder);
      
      // 4. 记录日志
      await this.logSync('refund_created', refundData, 'success');
      
      console.log('🎉 退货单创建流程完成\n');
      
      return {
        success: true,
        message: '退货单创建成功',
        data: { orderId, refundId, returnOrder },
      };
    } catch (error) {
      console.error('❌ 创建退货单失败:', error.message);
      await this.logSync('refund_created', refundData, 'failed', error);
      
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
    
    try {
      const { orderId, codes, itemId, skuId } = returnData;
      
      console.log('📦 接收退货完成数据:', {
        orderId,
        codesCount: codes ? codes.length : 0,
      });
      
      // 1. 验证数据
      if (!codes || codes.length === 0) {
        throw new Error('缺少必需参数: codes');
      }
      
      // 2. 给有赞加回库存
      console.log('📊 恢复有赞库存...');
      const quantity = codes.length;
      if (itemId) {
        await this.youzanClient.addStock(itemId, skuId || '', quantity);
        console.log(`✅ 有赞库存已恢复 ${quantity} 件`);
      } else {
        console.log('⚠️  未提供itemId，跳过库存恢复');
      }
      
      // 3. 记录日志
      await this.logSync('return_complete', returnData, 'success');
      
      console.log('🎉 退货完成流程完成\n');
      
      return {
        success: true,
        message: '退货库存恢复成功',
        data: { orderId, codes },
      };
    } catch (error) {
      console.error('❌ 退货库存恢复失败:', error.message);
      await this.logSync('return_complete', returnData, 'failed', error);
      
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getProductMapping(productId) {
    // TODO: 实现产品映射关系查询
    // 从数据库或配置文件中查询第三方productId对应的有赞itemId和skuId
    // 返回: { itemId: 'xxx', skuId: 'xxx' }
    
    console.log('⚠️  getProductMapping 方法待实现，请配置产品映射关系');
    return null;
  }

  async saveProductMapping(productId, itemId, skuId) {
    // TODO: 实现产品映射关系保存
    // 将第三方productId和有赞itemId、skuId的映射关系保存到数据库或配置文件
    
    console.log('⚠️  saveProductMapping 方法待实现，请配置产品映射关系');
    return true;
  }
}

module.exports = new SyncService();
