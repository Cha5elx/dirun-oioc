const oiocClient = require('../../src/clients/oioc');
const syncService = require('../../src/services/sync');
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');

function getBeijingTimeStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().replace(/[:.]/g, '-').replace('Z', '');
}

const LOG_FILE = path.join(LOG_DIR, `test-${getBeijingTimeStr()}.log`);

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

function getBeijingTime() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function writeLog(message) {
  const timestamp = getBeijingTime();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8');
}

console.log = function(...args) {
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, 2);
    }
    return String(arg);
  }).join(' ');
  originalConsoleLog.apply(console, args);
  writeLog(message);
};

console.error = function(...args) {
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, 2);
    }
    return String(arg);
  }).join(' ');
  originalConsoleError.apply(console, args);
  writeLog(`[ERROR] ${message}`);
};

const TEST_PRODUCT = {
  productID: '12479C06-1F34-42F8-A4EC-C0B7EF2561FD',
  productName: '测试产品',
  standard: '',
};

const TEST_CONFIG = {
  itemId: 'TEST_ITEM_001',
  skuId: 'TEST_SKU_001',
  quantity: 3,
  testOrderId: `TEST_ORDER_${Date.now()}`,
  logisticsNo: `SF${Date.now()}`,
  warehouseID: 'FE7D844D-5CAB-4DB9-97FB-2C812C6F142D',
  userID: 'c59259d9-3ae5-430c-a5a0-afca1be27210',
  tuihuoID: '85110428-20CB-477E-9516-390A96320C7B',
};

const testResults = {
  flow1: null,
  flow2_order: null,
  flow2_outbound: null,
  flow3_refund: null,
  flow3_return: null,
};

function printSeparator(title) {
  console.log('\n');
  console.log('='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function printSubTitle(title) {
  console.log('\n' + '-'.repeat(40));
  console.log(`  ${title}`);
  console.log('-'.repeat(40));
}

async function testFlow1_Inbound() {
  printSeparator('流程1: 商品采购入库测试');
  
  try {
    console.log('\n📋 测试参数:');
    console.log(`   产品ID: ${TEST_PRODUCT.productID}`);
    console.log(`   产品名称: ${TEST_PRODUCT.productName}`);
    console.log(`   入库数量: ${TEST_CONFIG.quantity}`);
    console.log(`   有赞商品ID: ${TEST_CONFIG.itemId}`);
    console.log(`   收货人ID(仓库ID): ${TEST_CONFIG.warehouseID}`);
    
    printSubTitle('步骤1: 登录第三方系统');
    const loginResult = await oiocClient.login();
    if (!loginResult || !loginResult.token) {
      throw new Error('登录失败');
    }
    console.log('✅ 登录成功');
    
    printSubTitle('步骤2: 创建入库单');
    const inboundOrder = await oiocClient.createInboundOrder({
      orderNumber: `IN${Date.now()}`,
      receiverID: TEST_CONFIG.warehouseID,
      detailList: [{
        productID: TEST_PRODUCT.productID,
        expectedQty: TEST_CONFIG.quantity,
      }],
    });
    console.log('✅ 入库单创建成功');
    console.log('   返回数据:', JSON.stringify(inboundOrder, null, 2));
    
    printSubTitle('步骤3: 查询入库订单详情');
    const inboundDetail = await oiocClient.getInboundOrderDetail({
      productID: TEST_PRODUCT.productID,
    });
    console.log('✅ 入库订单查询成功');
    if (inboundDetail && inboundDetail.data) {
      console.log(`   查询到 ${Array.isArray(inboundDetail.data) ? inboundDetail.data.length : 1} 条入库记录`);
    }
    
    testResults.flow1 = { success: true, data: inboundOrder };
    console.log('\n🎉 流程1测试完成: 入库流程成功');
    
    return { success: true, data: inboundOrder };
  } catch (error) {
    console.error('\n❌ 流程1测试失败:', error.message);
    testResults.flow1 = { success: false, error: error.message };
    return { success: false, error: error.message };
  }
}

async function testFlow2_OrderCreated() {
  printSeparator('流程2: 销售发货 - 订单创建测试');
  
  try {
    console.log('\n📋 测试参数:');
    console.log(`   订单号: ${TEST_CONFIG.testOrderId}`);
    console.log(`   产品ID: ${TEST_PRODUCT.productID}`);
    console.log(`   数量: ${TEST_CONFIG.quantity}`);
    console.log(`   收货人ID(代理ID): ${TEST_CONFIG.tuihuoID}`);
    console.log(`   发货人ID(仓库ID): ${TEST_CONFIG.warehouseID}`);
    
    printSubTitle('步骤1: 登录第三方系统');
    const loginResult = await oiocClient.login();
    if (!loginResult || !loginResult.token) {
      throw new Error('登录失败');
    }
    console.log('✅ 登录成功');
    
    printSubTitle('步骤2: 创建出库单');
    const outboundOrder = await oiocClient.createOutboundOrder({
      orderNumber: TEST_CONFIG.testOrderId,
      receiverID: TEST_CONFIG.tuihuoID,
      shipperID: TEST_CONFIG.warehouseID,
      detailList: [{
        productID: TEST_PRODUCT.productID,
        expectedQty: TEST_CONFIG.quantity,
      }],
    });
    console.log('✅ 出库单创建成功');
    console.log('   返回数据:', JSON.stringify(outboundOrder, null, 2));
    
    testResults.flow2_order = { success: true, data: outboundOrder };
    console.log('\n🎉 流程2-订单创建测试完成');
    
    return { success: true, data: outboundOrder };
  } catch (error) {
    console.error('\n❌ 流程2-订单创建测试失败:', error.message);
    testResults.flow2_order = { success: false, error: error.message };
    return { success: false, error: error.message };
  }
}

async function testFlow2_Outbound() {
  printSeparator('流程2: 销售发货 - 出库发货测试');
  
  try {
    const mockCodes = [
      { code: `CODE${Date.now()}001` },
      { code: `CODE${Date.now()}002` },
      { code: `CODE${Date.now()}003` },
    ];
    
    console.log('\n📋 测试参数:');
    console.log(`   订单号: ${TEST_CONFIG.testOrderId}`);
    console.log(`   物流单号: ${TEST_CONFIG.logisticsNo}`);
    console.log(`   防伪码数量: ${mockCodes.length}`);
    console.log(`   防伪码: ${mockCodes.map(c => c.code).join(', ')}`);
    
    printSubTitle('模拟出库发货数据');
    console.log('⚠️  注意: 此步骤需要仓库扫码后，第三方系统推送数据');
    console.log('   这里模拟出库完成后的数据推送');
    
    const outboundData = {
      orderId: TEST_CONFIG.testOrderId,
      logisticsNo: TEST_CONFIG.logisticsNo,
      codes: mockCodes,
      itemId: TEST_CONFIG.itemId,
      skuId: TEST_CONFIG.skuId,
    };
    
    console.log('\n📤 模拟推送数据:');
    console.log(JSON.stringify(outboundData, null, 2));
    
    printSubTitle('查询出库订单详情');
    const outboundDetail = await oiocClient.getOutboundOrderDetail({
      userID: TEST_CONFIG.userID,
      orderNumber: TEST_CONFIG.testOrderId,
      orderTypeNumber: 20,
    });
    console.log('✅ 出库订单查询成功');
    if (outboundDetail && outboundDetail.data) {
      console.log(`   查询到 ${Array.isArray(outboundDetail.data) ? outboundDetail.data.length : 1} 条出库记录`);
    }
    
    testResults.flow2_outbound = { success: true, data: outboundData };
    console.log('\n🎉 流程2-出库发货测试完成');
    console.log('⚠️  注意: 有赞库存扣减和发货需要真实的有赞订单');
    
    return { success: true, data: outboundData };
  } catch (error) {
    console.error('\n❌ 流程2-出库发货测试失败:', error.message);
    testResults.flow2_outbound = { success: false, error: error.message };
    return { success: false, error: error.message };
  }
}

async function testFlow3_Refund() {
  printSeparator('流程3: 退货退款 - 创建退货单测试');
  
  try {
    console.log('\n📋 测试参数:');
    console.log(`   原订单号: ${TEST_CONFIG.testOrderId}`);
    console.log(`   产品ID: ${TEST_PRODUCT.productID}`);
    console.log(`   退货数量: ${TEST_CONFIG.quantity}`);
    console.log(`   收货人ID(仓库ID): ${TEST_CONFIG.warehouseID}`);
    console.log(`   发货人ID(退货代理ID): ${TEST_CONFIG.tuihuoID}`);
    
    printSubTitle('步骤1: 登录第三方系统');
    const loginResult = await oiocClient.login();
    if (!loginResult || !loginResult.token) {
      throw new Error('登录失败');
    }
    console.log('✅ 登录成功');
    
    printSubTitle('步骤2: 创建退货单');
    const returnOrder = await oiocClient.createReturnOrder({
      orderNumber: `RETURN${Date.now()}`,
      receiverID: TEST_CONFIG.warehouseID,
      shipperID: TEST_CONFIG.userID,
      detailList: [{
        productID: TEST_PRODUCT.productID,
        expectedQty: TEST_CONFIG.quantity,
      }],
    });
    console.log('✅ 退货单创建成功');
    console.log('   返回数据:', JSON.stringify(returnOrder, null, 2));
    
    testResults.flow3_refund = { success: true, data: returnOrder };
    console.log('\n🎉 流程3-退货单创建测试完成');
    
    return { success: true, data: returnOrder };
  } catch (error) {
    console.error('\n❌ 流程3-退货单创建测试失败:', error.message);
    testResults.flow3_refund = { success: false, error: error.message };
    return { success: false, error: error.message };
  }
}

async function testFlow3_ReturnComplete() {
  printSeparator('流程3: 退货退款 - 退货完成测试');
  
  try {
    const mockCodes = [
      { code: `CODE${Date.now()}001` },
      { code: `CODE${Date.now()}002` },
      { code: `CODE${Date.now()}003` },
    ];
    
    console.log('\n📋 测试参数:');
    console.log(`   原订单号: ${TEST_CONFIG.testOrderId}`);
    console.log(`   退货防伪码数量: ${mockCodes.length}`);
    
    printSubTitle('模拟退货完成数据');
    console.log('⚠️  注意: 此步骤需要仓库扫码退货后，第三方系统推送数据');
    console.log('   这里模拟退货完成后的数据推送');
    
    const returnData = {
      orderId: TEST_CONFIG.testOrderId,
      codes: mockCodes,
      itemId: TEST_CONFIG.itemId,
      skuId: TEST_CONFIG.skuId,
    };
    
    console.log('\n📤 模拟推送数据:');
    console.log(JSON.stringify(returnData, null, 2));
    
    printSubTitle('查询退货订单详情');
    const returnDetail = await oiocClient.getReturnOrderDetail({
      userID: TEST_CONFIG.userID,
      productID: TEST_PRODUCT.productID,
    });
    console.log('✅ 退货订单查询成功');
    if (returnDetail && returnDetail.data) {
      console.log(`   查询到 ${Array.isArray(returnDetail.data) ? returnDetail.data.length : 1} 条退货记录`);
    }
    
    testResults.flow3_return = { success: true, data: returnData };
    console.log('\n🎉 流程3-退货完成测试完成');
    console.log('⚠️  注意: 有赞库存恢复需要真实的有赞订单');
    
    return { success: true, data: returnData };
  } catch (error) {
    console.error('\n❌ 流程3-退货完成测试失败:', error.message);
    testResults.flow3_return = { success: false, error: error.message };
    return { success: false, error: error.message };
  }
}

function printTestSummary() {
  printSeparator('测试结果汇总');
  
  const results = [
    { name: '流程1: 商品采购入库', result: testResults.flow1 },
    { name: '流程2: 订单创建(出库单)', result: testResults.flow2_order },
    { name: '流程2: 出库发货', result: testResults.flow2_outbound },
    { name: '流程3: 创建退货单', result: testResults.flow3_refund },
    { name: '流程3: 退货完成', result: testResults.flow3_return },
  ];
  
  console.log('\n');
  results.forEach((item, index) => {
    const status = item.result?.success ? '✅ 成功' : '❌ 失败';
    console.log(`${index + 1}. ${item.name}: ${status}`);
    if (!item.result?.success && item.result?.error) {
      console.log(`   错误: ${item.result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.result?.success).length;
  console.log(`\n📊 统计: ${successCount}/${results.length} 测试通过`);
  
  console.log('\n📝 使用的产品信息:');
  console.log(`   产品ID: ${TEST_PRODUCT.productID}`);
  console.log(`   产品名称: ${TEST_PRODUCT.productName}`);
  
  console.log('\n⚠️  注意事项:');
  console.log('   1. 有赞相关操作需要真实的有赞订单和商品');
  console.log('   2. 出库和退货流程需要仓库扫码后才会触发数据推送');
  console.log('   3. 防伪码需要在第三方系统中真实存在才能绑定');
}

async function runAllTests() {
  console.log('\n');
  console.log('*'.repeat(60));
  console.log('*'.padEnd(58) + '*');
  console.log('*' + '第三方一物一码系统 - 完整流程测试'.padStart(35).padEnd(58) + '*');
  console.log('*'.padEnd(58) + '*');
  console.log('*'.repeat(60));
  
  console.log('\n📌 测试产品信息:');
  console.log(`   产品ID: ${TEST_PRODUCT.productID}`);
  console.log(`   产品名称: ${TEST_PRODUCT.productName}`);
  console.log(`   规格: ${TEST_PRODUCT.standard || '无'}`);
  
  await testFlow1_Inbound();
  
  await testFlow2_OrderCreated();
  
  await testFlow2_Outbound();
  
  await testFlow3_Refund();
  
  await testFlow3_ReturnComplete();
  
  printTestSummary();
  
  console.log('\n✨ 全部测试执行完成!\n');
}

runAllTests().catch((error) => {
  console.error('\n💥 测试执行出错:', error.message);
  process.exit(1);
});
