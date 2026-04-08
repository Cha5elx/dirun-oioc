const syncService = require('../../src/services/sync');

async function testInbound() {
  console.log('\n=== 测试入库流程 ===');
  
  const inboundData = {
    productId: 'PRODUCT_001',
    skuId: 'SKU_001',
    quantity: 100,
    codes: Array.from({ length: 100 }, (_, i) => `CODE_${i + 1}`),
  };
  
  const result = await syncService.handleInbound(inboundData);
  console.log('入库结果:', result);
}

async function testOrderCreated() {
  console.log('\n=== 测试订单创建流程 ===');
  
  const orderData = {
    orderId: 'ORDER_001',
    items: [
      { productId: 'PRODUCT_001', skuId: 'SKU_001', quantity: 2 },
    ],
    address: {
      name: '张三',
      phone: '13800138000',
      province: '浙江省',
      city: '杭州市',
      district: '西湖区',
      address: '某某街道',
    },
  };
  
  const result = await syncService.handleOrderCreated(orderData);
  console.log('订单创建结果:', result);
}

async function testOutbound() {
  console.log('\n=== 测试出库流程 ===');
  
  const outboundData = {
    orderId: 'ORDER_001',
    logisticsNo: 'SF1234567890',
    codes: [
      { code: 'CODE_1', skuId: 'SKU_001' },
      { code: 'CODE_2', skuId: 'SKU_001' },
    ],
  };
  
  const result = await syncService.handleOutbound(outboundData);
  console.log('出库结果:', result);
}

async function testRefund() {
  console.log('\n=== 测试退货流程 ===');
  
  const refundData = {
    orderId: 'ORDER_001',
    refundId: 'REFUND_001',
    items: [
      { productId: 'PRODUCT_001', skuId: 'SKU_001', quantity: 1 },
    ],
  };
  
  const result = await syncService.handleRefund(refundData);
  console.log('退货结果:', result);
}

async function testReturnComplete() {
  console.log('\n=== 测试退货完成流程 ===');
  
  const returnData = {
    orderId: 'ORDER_001',
    codes: [
      { code: 'CODE_1', skuId: 'SKU_001' },
    ],
  };
  
  const result = await syncService.handleReturnComplete(returnData);
  console.log('退货完成结果:', result);
}

async function runAllTests() {
  try {
    await testInbound();
    await testOrderCreated();
    await testOutbound();
    await testRefund();
    await testReturnComplete();
    
    console.log('\n=== 所有测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

runAllTests();
