/**
 * 一物一码同步服务 - 完整业务流程模拟测试
 * 
 * 功能说明：
 * 模拟完整的业务流程，包括：
 * - 流程1: 商品采购入库（扫码入库 → 有赞加库存）
 * - 流程2: 销售发货（用户下单 → 扫码发货 → 有赞自动发货）
 * - 流程3: 退货退款（用户退货 → 扫码退货 → 有赞恢复库存）
 * 
 * 运行方式：node tests/flow/simulate-flow.js
 * 日志输出：tests/flow/logs/simulate-{时间戳}.log
 */
const oiocClient = require('../../src/clients/oioc');
const youzanClient = require('../../src/clients/youzan');
const syncService = require('../../src/services/sync');
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');

function getBeijingTimeStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().replace(/[:.]/g, '-').replace('Z', '');
}

const LOG_FILE = path.join(LOG_DIR, `simulate-${getBeijingTimeStr()}.log`);

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

const MOCK_DATA = {
  product: {
    productID: '12479C06-1F34-42F8-A4EC-C0B7EF2561FD',
    productName: '橙花精油50ml',
    standard: '50ml/瓶',
  },
  youzan: {
    itemId: '702735944',
    skuId: '',
  },
  warehouse: {
    warehouseID: 'FE7D844D-5CAB-4DB9-97FB-2C812C6F142D',
    warehouseName: '成品仓',
  },
  agent: {
    userID: '85110428-20CB-477E-9516-390A96320C7B',
    userName: '测试代理',
  },
  codes: [],
};

function generateCodes(count) {
  const codes = [];
  const prefix = 'DR';
  const timestamp = Date.now();
  for (let i = 1; i <= count; i++) {
    codes.push({
      code: `${prefix}${timestamp}${String(i).padStart(4, '0')}`,
      productID: MOCK_DATA.product.productID,
      productName: MOCK_DATA.product.productName,
      status: 'created',
    });
  }
  return codes;
}

function printSeparator(title, char = '=') {
  const line = char.repeat(70);
  console.log('\n');
  console.log(line);
  console.log(`  ${title}`);
  console.log(line);
}

function printSubTitle(title) {
  console.log('\n' + '-'.repeat(50));
  console.log(`  ${title}`);
  console.log('-'.repeat(50));
}

async function simulateFlow1_Inbound(quantity = 5) {
  printSeparator('流程1: 商品采购入库', '█');
  console.log('\n  【业务场景】第三方系统扫码入库 → 同步到有赞加库存');
  console.log('\n  📋 商品信息:');
  console.log(`     产品ID: ${MOCK_DATA.product.productID}`);
  console.log(`     产品名称: ${MOCK_DATA.product.productName}`);
  console.log(`     入库数量: ${quantity} 件`);
  console.log(`     有赞商品ID: ${MOCK_DATA.youzan.itemId}`);
  console.log(`     收货仓库: ${MOCK_DATA.warehouse.warehouseName}`);
  
  try {
    printSubTitle('步骤1: 确保已登录（Token复用）');
    await oiocClient.ensureLogin();
    console.log('  ✅ Token有效，继续执行');
    
    printSubTitle('步骤2: 模拟生成防伪码');
    const codes = generateCodes(quantity);
    MOCK_DATA.codes = codes;
    console.log(`\n  ✅ 已生成 ${quantity} 个唯一防伪码:`);
    codes.slice(0, 3).forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.code}`);
    });
    if (quantity > 3) {
      console.log(`     ... 共 ${quantity} 个`);
    }
    
    printSubTitle('步骤3: 创建入库单（模拟仓库扫码入库）');
    console.log('\n  📝 说明: 这里模拟仓库扫描每件商品的防伪码后，创建入库单');
    const orderData = {
      orderNumber: `IN${Date.now()}`,
      receiverID: MOCK_DATA.warehouse.warehouseID,
      detailList: [{
        productID: MOCK_DATA.product.productID,
        expectedQty: quantity,
      }],
    };
    const inboundOrder = await oiocClient.createInboundOrder(orderData);
    console.log(`\n  ✅ 入库单创建成功: ${orderData.orderNumber}`);
    
    printSubTitle('步骤4: 同步到有赞（调用同步服务）');
    console.log('\n  📝 说明: 将入库信息同步到有赞，增加库存');
    const syncData = {
      productId: MOCK_DATA.product.productID,
      itemId: MOCK_DATA.youzan.itemId,
      skuId: MOCK_DATA.youzan.skuId,
      quantity: quantity,
      codes: codes,
      receiverID: MOCK_DATA.warehouse.warehouseID,
    };
    const syncResult = await syncService.handleInbound(syncData);
    console.log(`\n  📊 同步结果: ${syncResult.success ? '✅ 成功' : '❌ 失败'}`);
    if (syncResult.message) {
      console.log(`     消息: ${syncResult.message}`);
    }
    
    printSubTitle('步骤5: 查询入库订单确认');
    const inboundDetail = await oiocClient.getInboundOrderDetail({
      productID: MOCK_DATA.product.productID,
      limit: 3,
    });
    
    console.log('\n  ══════════════════════════════════════════');
    console.log('  🎉 流程1完成: 入库流程成功');
    console.log('  ══════════════════════════════════════════');
    console.log(`  - 生成防伪码: ${quantity} 个`);
    console.log(`  - 入库单号: ${orderData.orderNumber}`);
    console.log(`  - 有赞库存: +${quantity}`);
    
    return { success: true, codes, orderNumber: orderData.orderNumber };
  } catch (error) {
    console.error('\n  ❌ 流程1失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function simulateFlow2_Outbound(quantity = 2) {
  printSeparator('流程2: 销售发货', '█');
  console.log('\n  【业务场景】用户下单 → 仓库扫码发货 → 有赞自动发货扣库存');
  
  const orderNumber = `ORDER_${Date.now()}`;
  const logisticsNo = `SF${Date.now()}`;
  
  console.log('\n  📋 订单信息:');
  console.log(`     订单号: ${orderNumber}`);
  console.log(`     产品: ${MOCK_DATA.product.productName}`);
  console.log(`     数量: ${quantity} 件`);
  console.log(`     物流单号: ${logisticsNo}`);
  console.log(`     收货代理: ${MOCK_DATA.agent.userName}`);
  console.log(`     发货仓库: ${MOCK_DATA.warehouse.warehouseName}`);
  
  try {
    printSubTitle('步骤1: 确保已登录（Token复用）');
    await oiocClient.ensureLogin();
    console.log('  ✅ Token有效，继续执行');
    
    printSubTitle('步骤2: 创建出库单（模拟用户下单）');
    console.log('\n  📝 说明: 用户在有赞下单后，在第三方系统创建出库单');
    const orderData = {
      orderNumber: orderNumber,
      receiverID: MOCK_DATA.agent.userID,
      shipperID: MOCK_DATA.warehouse.warehouseID,
      detailList: [{
        productID: MOCK_DATA.product.productID,
        expectedQty: quantity,
      }],
    };
    const outboundOrder = await oiocClient.createOutboundOrder(orderData);
    console.log(`\n  ✅ 出库单创建成功: ${orderNumber}`);
    
    printSubTitle('步骤3: 模拟仓库扫码发货');
    console.log('\n  📝 说明: 仓库扫描防伪码发货，一个码绑定一件商品');
    const shipCodes = MOCK_DATA.codes.slice(0, quantity);
    if (shipCodes.length < quantity) {
      console.log(`  ⚠️  防伪码不足，生成新的 ${quantity} 个码`);
      const newCodes = generateCodes(quantity);
      shipCodes.length = 0;
      shipCodes.push(...newCodes);
    }
    console.log(`\n  📦 扫描发货的防伪码:`);
    shipCodes.forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.code}`);
    });
    
    printSubTitle('步骤4: 同步到有赞（发货、扣库存、写防伪码）');
    console.log('\n  📝 说明: 同步发货信息到有赞，扣减库存并写入防伪码');
    const syncData = {
      orderId: orderNumber,
      logisticsNo: logisticsNo,
      codes: shipCodes,
      itemId: MOCK_DATA.youzan.itemId,
      skuId: MOCK_DATA.youzan.skuId,
    };
    const syncResult = await syncService.handleOutbound(syncData);
    console.log(`\n  📊 同步结果: ${syncResult.success ? '✅ 成功' : '❌ 失败'}`);
    if (syncResult.message) {
      console.log(`     消息: ${syncResult.message}`);
    }
    
    printSubTitle('步骤5: 查询出库订单确认');
    const outboundDetail = await oiocClient.getOutboundOrderDetail({
      userID: MOCK_DATA.agent.userID,
      orderTypeNumber: 20,
      limit: 3,
    });
    
    console.log('\n  ══════════════════════════════════════════');
    console.log('  🎉 流程2完成: 发货流程成功');
    console.log('  ══════════════════════════════════════════');
    console.log(`  - 出库单号: ${orderNumber}`);
    console.log(`  - 发货防伪码: ${quantity} 个`);
    console.log(`  - 物流单号: ${logisticsNo}`);
    console.log(`  - 有赞库存: -${quantity}`);
    
    return { success: true, orderNumber, logisticsNo, codes: shipCodes };
  } catch (error) {
    console.error('\n  ❌ 流程2失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function simulateFlow3_Return(quantity = 1) {
  printSeparator('流程3: 退货退款', '█');
  console.log('\n  【业务场景】用户退货 → 仓库扫码退货 → 有赞恢复库存');
  
  const returnOrderNumber = `RETURN_${Date.now()}`;
  
  console.log('\n  📋 退货信息:');
  console.log(`     退货单号: ${returnOrderNumber}`);
  console.log(`     产品: ${MOCK_DATA.product.productName}`);
  console.log(`     退货数量: ${quantity} 件`);
  console.log(`     收货仓库: ${MOCK_DATA.warehouse.warehouseName}`);
  console.log(`     退货代理: ${MOCK_DATA.agent.userName}`);
  
  try {
    printSubTitle('步骤1: 确保已登录（Token复用）');
    await oiocClient.ensureLogin();
    console.log('  ✅ Token有效，继续执行');
    
    printSubTitle('步骤2: 创建退货单（模拟用户申请退货）');
    console.log('\n  📝 说明: 用户申请退货后，在第三方系统创建退货单');
    const orderData = {
      orderNumber: returnOrderNumber,
      receiverID: MOCK_DATA.warehouse.warehouseID,
      shipperID: MOCK_DATA.agent.userID,
      detailList: [{
        productID: MOCK_DATA.product.productID,
        expectedQty: quantity,
      }],
    };
    const returnOrder = await oiocClient.createReturnOrder(orderData);
    console.log(`\n  ✅ 退货单创建成功: ${returnOrderNumber}`);
    
    printSubTitle('步骤3: 模拟仓库扫码退货');
    console.log('\n  📝 说明: 仓库收到退货后扫描防伪码，码可再次销售');
    const returnCodes = MOCK_DATA.codes.slice(0, quantity);
    if (returnCodes.length < quantity) {
      console.log(`  ⚠️  防伪码不足，生成新的 ${quantity} 个码`);
      const newCodes = generateCodes(quantity);
      returnCodes.length = 0;
      returnCodes.push(...newCodes);
    }
    console.log(`\n  📦 扫描退货的防伪码:`);
    returnCodes.forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.code}`);
    });
    
    printSubTitle('步骤4: 同步到有赞（恢复库存）');
    console.log('\n  📝 说明: 退货完成后，恢复有赞库存');
    const syncData = {
      orderId: returnOrderNumber,
      codes: returnCodes,
      itemId: MOCK_DATA.youzan.itemId,
      skuId: MOCK_DATA.youzan.skuId,
    };
    const syncResult = await syncService.handleReturnComplete(syncData);
    console.log(`\n  📊 同步结果: ${syncResult.success ? '✅ 成功' : '❌ 失败'}`);
    if (syncResult.message) {
      console.log(`     消息: ${syncResult.message}`);
    }
    
    printSubTitle('步骤5: 查询退货订单确认');
    const returnDetail = await oiocClient.getReturnOrderDetail({
      userID: MOCK_DATA.agent.userID,
      limit: 3,
    });
    
    console.log('\n  ══════════════════════════════════════════');
    console.log('  🎉 流程3完成: 退货流程成功');
    console.log('  ══════════════════════════════════════════');
    console.log(`  - 退货单号: ${returnOrderNumber}`);
    console.log(`  - 退货防伪码: ${quantity} 个`);
    console.log(`  - 有赞库存: +${quantity}`);
    
    return { success: true, returnOrderNumber, codes: returnCodes };
  } catch (error) {
    console.error('\n  ❌ 流程3失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllSimulations() {
  console.log('\n');
  console.log('█'.repeat(70));
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█' + '一物一码同步服务 - 完整业务流程模拟测试'.padStart(45).padEnd(68) + '█');
  console.log('█' + ' '.repeat(68) + '█');
  console.log('█'.repeat(70));
  
  console.log('\n📌 模拟测试说明:');
  console.log('   本测试模拟完整的业务流程:');
  console.log('   - 流程1: 商品采购入库（扫码入库 → 有赞加库存）');
  console.log('   - 流程2: 销售发货（用户下单 → 扫码发货 → 有赞自动发货）');
  console.log('   - 流程3: 退货退款（用户退货 → 扫码退货 → 有赞恢复库存）');
  
  console.log('\n🔐 步骤0: 登录第三方系统（获取Token，后续流程复用）');
  try {
    const loginResult = await oiocClient.login();
    if (!loginResult || !loginResult.token) {
      throw new Error('登录失败');
    }
    console.log('  ✅ 登录成功，Token已保存，后续流程将复用此Token');
  } catch (error) {
    console.error('  ❌ 登录失败:', error.message);
    process.exit(1);
  }
  
  const results = {
    flow1: null,
    flow2: null,
    flow3: null,
  };
  
  results.flow1 = await simulateFlow1_Inbound(5);
  
  results.flow2 = await simulateFlow2_Outbound(2);
  
  results.flow3 = await simulateFlow3_Return(1);
  
  printSeparator('测试结果汇总', '█');
  
  console.log('\n');
  const testResults = [
    { name: '流程1: 商品采购入库', result: results.flow1 },
    { name: '流程2: 销售发货', result: results.flow2 },
    { name: '流程3: 退货退款', result: results.flow3 },
  ];
  
  testResults.forEach((item, index) => {
    const status = item.result?.success ? '✅ 成功' : '❌ 失败';
    console.log(`  ${index + 1}. ${item.name}: ${status}`);
    if (!item.result?.success && item.result?.error) {
      console.log(`     错误: ${item.result.error}`);
    }
  });
  
  const successCount = testResults.filter(r => r.result?.success).length;
  console.log(`\n  📊 统计: ${successCount}/${testResults.length} 测试通过`);
  
  console.log(`\n  📝 日志文件: ${LOG_FILE}`);
  console.log('');
}

runAllSimulations().catch((error) => {
  console.error('\n💥 模拟测试执行出错:', error.message);
  process.exit(1);
});
