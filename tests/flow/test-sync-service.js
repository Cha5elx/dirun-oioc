const syncService = require('../../src/services/sync');

async function testInbound() {
  console.log('\n\n🧪 测试流程1: 商品采购入库');
  console.log('='.repeat(60));
  
  const inboundData = {
    productId: 'df4ba8e4-8092-11ec-adc3-f78536c9c35a',
    itemId: '702735944',
    skuId: '',
    quantity: 100,
    codes: Array.from({ length: 100 }, (_, i) => `CODE_${i + 1}`),
    receiverID: 'FE7D844D-5CAB-4DB9-97FB-2C812C6F142D',
  };
  
  const result = await syncService.handleInbound(inboundData);
  console.log('\n结果:', result);
  return result.success;
}

async function testOrderCreated() {
  console.log('\n\n🧪 测试流程2: 销售发货 - 订单创建');
  console.log('='.repeat(60));
  
  const orderData = {
    orderId: 'E20200529225447084600005',
  };
  
  const result = await syncService.handleOrderCreated(orderData);
  console.log('\n结果:', result);
  return result.success;
}

async function testOutbound() {
  console.log('\n\n🧪 测试流程2: 销售发货 - 出库发货');
  console.log('='.repeat(60));
  
  const outboundData = {
    orderId: 'E20200828154641023700067',
    logisticsNo: 'SF1234567890',
    codes: [
      { code: 'CODE_1', skuId: '' },
      { code: 'CODE_2', skuId: '' },
    ],
    itemId: '702735944',
    skuId: '',
  };
  
  const result = await syncService.handleOutbound(outboundData);
  console.log('\n结果:', result);
  return result.success;
}

async function testRefund() {
  console.log('\n\n🧪 测试流程3: 退货退款 - 创建退货单');
  console.log('='.repeat(60));
  
  const refundData = {
    orderId: 'E20200602151020001500009',
    refundId: 'REFUND_001',
    items: [
      { productID: 'df4ba8e4-8092-11ec-adc3-f78536c9c35a', expectedQty: 1 },
    ],
    receiverID: 'FE7D844D-5CAB-4DB9-97FB-2C812C6F142D',
  };
  
  const result = await syncService.handleRefund(refundData);
  console.log('\n结果:', result);
  return result.success;
}

async function testReturnComplete() {
  console.log('\n\n🧪 测试流程3: 退货退款 - 退货完成');
  console.log('='.repeat(60));
  
  const returnData = {
    orderId: 'E20200602151020001500009',
    codes: [
      { code: 'CODE_1', skuId: '' },
    ],
    itemId: '702735944',
    skuId: '',
  };
  
  const result = await syncService.handleReturnComplete(returnData);
  console.log('\n结果:', result);
  return result.success;
}

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          有赞与第三方一物一码同步服务测试                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = [];
  
  // 测试流程1：入库
  results.push({ test: '流程1: 商品采购入库', success: await testInbound() });
  
  // 测试流程2：订单创建
  results.push({ test: '流程2: 订单创建', success: await testOrderCreated() });
  
  // 测试流程2：出库发货
  results.push({ test: '流程2: 出库发货', success: await testOutbound() });
  
  // 测试流程3：退货单创建
  results.push({ test: '流程3: 创建退货单', success: await testRefund() });
  
  // 测试流程3：退货完成
  results.push({ test: '流程3: 退货完成', success: await testReturnComplete() });
  
  // 输出测试结果汇总
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                      测试结果汇总                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  results.forEach(({ test, success }) => {
    const icon = success ? '✅' : '❌';
    const status = success ? '成功' : '失败';
    console.log(`${icon} ${test}: ${status}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n📊 总计: ${successCount}/${results.length} 个测试通过`);
  
  console.log('\n💡 提示:');
  console.log('  - 日志文件位置: logs/sync.log');
  console.log('  - 可以查看日志文件了解详细执行过程');
  console.log('  - 部分测试可能因为订单不存在而失败，这是正常的');
  console.log('');
}

runAllTests().catch(console.error);
