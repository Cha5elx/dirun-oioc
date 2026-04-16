/**
 * 全流程模拟脚本
 * 模拟完整的业务流程：入库 → 销售 → 退货
 * 
 * 使用方法：
 * 1. 启动后端服务：node index.js
 * 2. 启动前端服务：cd admin && npm run dev
 * 3. 在新终端运行：node tests/flow/simulate-flow.js
 * 4. 打开浏览器访问 http://localhost:5173 查看数据实时更新
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

let flowData = {
  products: [],
  orders: [],
  codes: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const prefix = {
    'info': 'ℹ️ ',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️ ',
    'step': '📍',
    'data': '📊'
  }[type] || 'ℹ️ ';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateCode(prefix) {
  return `${prefix}${Date.now()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
}

async function simulateInbound() {
  log('\n=====================================', 'step');
  log('流程1: 商品采购入库', 'step');
  log('=====================================', 'step');
  
  const productId = 'PROD001';
  const itemId = 'ITEM001';
  const skuId = 'SKU001';
  const quantity = 100;
  const codes = [];
  
  for (let i = 0; i < quantity; i++) {
    codes.push({
      code: generateCode('IN'),
      status: 'active',
      productId: productId
    });
  }
  
  log(`📦 入库商品: 橙花精油50ml`, 'data');
  log(`   数量: ${quantity} 件`, 'data');
  log(`   防伪码: ${codes.slice(0, 3).map(c => c.code).join(', ')}... 等${quantity}个`, 'data');
  
  try {
    const response = await axios.post(`${BASE_URL}/webhook/oioc`, {
      type: 'inbound',
      data: {
        productId,
        itemId,
        skuId,
        quantity,
        codes,
        receiverID: 'WAREHOUSE001'
      }
    });
    
    if (response.data.code === 0 && response.data.data.success) {
      log('✅ 入库成功！有赞库存已增加', 'success');
      flowData.codes.push(...codes);
      return true;
    } else {
      log(`❌ 入库失败: ${response.data.msg}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ 入库请求失败: ${error.message}`, 'error');
    return false;
  }
}

async function simulateOrderCreated() {
  log('\n=====================================', 'step');
  log('流程2: 用户下单付款', 'step');
  log('=====================================', 'step');
  
  const orderId = `YZ${Date.now()}`;
  const items = [
    { productID: 'PROD001', expectedQty: 2 }
  ];
  
  log(`🛒 订单号: ${orderId}`, 'data');
  log(`   商品: 橙花精油50ml x 2`, 'data');
  
  try {
    const response = await axios.post(`${BASE_URL}/webhook/youzan`, {
      type: 'trade_TradePaid',
      data: {
        orderId,
        items
      }
    });
    
    if (response.data.code === 0) {
      log('✅ 订单创建成功，已创建出库单', 'success');
      flowData.orders.push({ orderId, items });
      return orderId;
    } else {
      log(`❌ 订单创建失败: ${response.data.msg}`, 'error');
      return null;
    }
  } catch (error) {
    log(`❌ 订单请求失败: ${error.message}`, 'error');
    return null;
  }
}

async function simulateOutbound(orderId) {
  log('\n=====================================', 'step');
  log('流程3: 仓库扫码发货', 'step');
  log('=====================================', 'step');
  
  if (flowData.codes.length < 2) {
    log('❌ 库存不足，无法发货', 'error');
    return false;
  }
  
  const codes = flowData.codes.splice(0, 2);
  const logisticsNo = `SF${Date.now()}`;
  
  log(`📦 发货商品: 橙花精油50ml x 2`, 'data');
  log(`   防伪码: ${codes.map(c => c.code).join(', ')}`, 'data');
  log(`   物流单号: ${logisticsNo}`, 'data');
  
  try {
    const response = await axios.post(`${BASE_URL}/webhook/oioc`, {
      type: 'outbound',
      data: {
        orderId,
        logisticsNo,
        codes,
        itemId: 'ITEM001',
        skuId: 'SKU001'
      }
    });
    
    if (response.data.code === 0 && response.data.data.success) {
      log('✅ 发货成功！', 'success');
      log('   - 有赞库存已扣减', 'data');
      log('   - 订单已标记为已发货', 'data');
      log('   - 防伪码已写入订单备注', 'data');
      return true;
    } else {
      log(`❌ 发货失败: ${response.data.msg}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ 发货请求失败: ${error.message}`, 'error');
    return false;
  }
}

async function simulateRefund(orderId) {
  log('\n=====================================', 'step');
  log('流程4: 用户申请退货', 'step');
  log('=====================================', 'step');
  
  const refundId = `RF${Date.now()}`;
  const items = [
    { productID: 'PROD001', expectedQty: 1 }
  ];
  
  log(`🔄 退货申请: 退回1件商品`, 'data');
  log(`   退款单号: ${refundId}`, 'data');
  
  try {
    const response = await axios.post(`${BASE_URL}/webhook/youzan`, {
      type: 'trade_TradeRefundCreated',
      data: {
        orderId,
        refundId,
        items
      }
    });
    
    if (response.data.code === 0) {
      log('✅ 退货申请已提交，已创建退货单', 'success');
      return refundId;
    } else {
      log(`❌ 退货申请失败: ${response.data.msg}`, 'error');
      return null;
    }
  } catch (error) {
    log(`❌ 退货请求失败: ${error.message}`, 'error');
    return null;
  }
}

async function simulateReturnComplete(orderId) {
  log('\n=====================================', 'step');
  log('流程5: 仓库扫码退货入库', 'step');
  log('=====================================', 'step');
  
  const returnCode = generateCode('RET');
  
  log(`📦 退货入库: 1件商品`, 'data');
  log(`   防伪码: ${returnCode}`, 'data');
  
  try {
    const response = await axios.post(`${BASE_URL}/webhook/oioc`, {
      type: 'return_complete',
      data: {
        orderId,
        codes: [{ code: returnCode, status: 'returned' }],
        itemId: 'ITEM001',
        skuId: 'SKU001'
      }
    });
    
    if (response.data.code === 0 && response.data.data.success) {
      log('✅ 退货入库成功！', 'success');
      log('   - 有赞库存已恢复', 'data');
      return true;
    } else {
      log(`❌ 退货入库失败: ${response.data.msg}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ 退货入库请求失败: ${error.message}`, 'error');
    return false;
  }
}

async function runFullFlow() {
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   有赞一物一码系统 - 全流程测试      ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  log('💡 提示: 请确保服务已启动', 'warning');
  log('   后端: node index.js', 'info');
  log('   前端: cd admin && npm run dev', 'info');
  log('   浏览器: http://localhost:5173', 'info');
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // 流程1: 入库
    const inboundSuccess = await simulateInbound();
    if (!inboundSuccess) {
      log('\n❌ 入库失败，流程终止', 'error');
      return;
    }
    
    log('\n⏳ 等待3秒，请在前端查看入库数据...', 'info');
    await sleep(3000);
    
    // 流程2: 订单创建
    const orderId = await simulateOrderCreated();
    if (!orderId) {
      log('\n❌ 订单创建失败，流程终止', 'error');
      return;
    }
    
    log('\n⏳ 等待3秒，请在前端查看订单数据...', 'info');
    await sleep(3000);
    
    // 流程3: 发货
    const outboundSuccess = await simulateOutbound(orderId);
    if (!outboundSuccess) {
      log('\n❌ 发货失败，流程终止', 'error');
      return;
    }
    
    log('\n⏳ 等待3秒，请在前端查看出库数据...', 'info');
    await sleep(3000);
    
    // 流程4: 退货申请
    const refundId = await simulateRefund(orderId);
    if (!refundId) {
      log('\n❌ 退货申请失败，流程终止', 'error');
      return;
    }
    
    log('\n⏳ 等待3秒，请在前端查看退货申请...', 'info');
    await sleep(3000);
    
    // 流程5: 退货完成
    const returnSuccess = await simulateReturnComplete(orderId);
    if (!returnSuccess) {
      log('\n❌ 退货入库失败，流程终止', 'error');
      return;
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n');
    console.log('╔══════════════════════════════════════╗');
    console.log('║          🎉 全流程测试完成！         ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    log(`总耗时: ${duration}秒`, 'data');
    console.log('');
    log('📊 数据统计:', 'data');
    log(`   - 入库: 100件商品`, 'data');
    log(`   - 订单: 1笔订单`, 'data');
    log(`   - 出库: 2件商品`, 'data');
    log(`   - 退货: 1件商品`, 'data');
    console.log('');
    log('💡 提示: 刷新前端页面查看完整数据', 'info');
    log('   访问: http://localhost:5173', 'info');
    log('   账号: cangku001 / 123456', 'info');
    console.log('');
    
  } catch (error) {
    log(`\n❌ 流程执行出错: ${error.message}`, 'error');
    console.log('');
    log('💡 请检查:', 'warning');
    log('   1. 后端服务是否启动 (node index.js)', 'info');
    log('   2. 前端服务是否启动 (cd admin && npm run dev)', 'info');
    log('   3. 端口3000和5173是否被占用', 'info');
    console.log('');
  }
}

if (require.main === module) {
  runFullFlow();
}

module.exports = { runFullFlow };
