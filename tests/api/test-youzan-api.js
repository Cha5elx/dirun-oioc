const youzanClient = require('../../src/clients/youzan');

async function testGetToken() {
  console.log('\n=== 测试获取Token ===');
  try {
    const token = await youzanClient.getToken();
    console.log('✅ 获取Token成功');
    console.log('Token:', token.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('❌ 获取Token失败:', error.message);
    return false;
  }
}

async function testGetProduct() {
  console.log('\n=== 测试获取商品详情 ===');
  try {
    const itemId = '702735944';
    const result = await youzanClient.getProduct(itemId);
    console.log('✅ 获取商品详情成功');
    console.log('商品信息:', result.item ? result.item.title : '未知');
    return true;
  } catch (error) {
    console.error('❌ 获取商品详情失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    return false;
  }
}

async function testUpdateStock() {
  console.log('\n=== 测试更新库存 ===');
  try {
    const itemId = '702735944';
    const skuId = '';
    const quantity = 110;
    
    const result = await youzanClient.updateStock(itemId, skuId, quantity, '0');
    console.log('✅ 更新库存成功');
    console.log('库存数量:', quantity);
    return true;
  } catch (error) {
    console.error('❌ 更新库存失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    return false;
  }
}

async function testGetOrder() {
  console.log('\n=== 测试获取订单详情 ===');
  try {
    const orderId = 'E20200529225447084600005';
    const result = await youzanClient.getOrder(orderId);
    console.log('✅ 获取订单详情成功');
    console.log('订单状态:', result.trade ? result.trade.status : '未知');
    return true;
  } catch (error) {
    console.error('❌ 获取订单详情失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    return false;
  }
}

async function testShipOrder() {
  console.log('\n=== 测试订单发货 ===');
  try {
    const orderId = 'E20200828154641023700067';
    const logisticsData = {
      out_stype: '1',
      out_sid: 'TEST123456',
    };
    
    const result = await youzanClient.shipOrder(orderId, logisticsData);
    console.log('✅ 订单发货成功');
    return true;
  } catch (error) {
    console.error('❌ 订单发货失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    return false;
  }
}

async function testUpdateOrderRemark() {
  console.log('\n=== 测试更新订单备注 ===');
  try {
    const orderId = 'E20200602151020001500009';
    const remark = '测试备注 - 防伪码: CODE_001, CODE_002';
    
    const result = await youzanClient.updateOrderRemark(orderId, remark);
    console.log('✅ 更新订单备注成功');
    return true;
  } catch (error) {
    console.error('❌ 更新订单备注失败:', error.message);
    if (error.response) {
      console.error('错误详情:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('====================================');
  console.log('开始测试有赞API');
  console.log('====================================');
  
  const results = [];
  
  // 测试获取Token（必须先获取Token）
  const tokenSuccess = await testGetToken();
  results.push({ test: '获取Token', success: tokenSuccess });
  
  if (tokenSuccess) {
    // Token成功后测试其他接口
    results.push({ test: '获取商品详情', success: await testGetProduct() });
    results.push({ test: '更新库存', success: await testUpdateStock() });
    results.push({ test: '获取订单详情', success: await testGetOrder() });
    // results.push({ test: '订单发货', success: await testShipOrder() });
    // results.push({ test: '更新订单备注', success: await testUpdateOrderRemark() });
  } else {
    console.log('\n⚠️  获取Token失败，跳过其他测试');
  }
  
  // 输出测试结果汇总
  console.log('\n====================================');
  console.log('测试结果汇总');
  console.log('====================================');
  results.forEach(({ test, success }) => {
    console.log(`${success ? '✅' : '❌'} ${test}: ${success ? '成功' : '失败'}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n总计: ${successCount}/${results.length} 个测试通过`);
}

runTests().catch(console.error);
