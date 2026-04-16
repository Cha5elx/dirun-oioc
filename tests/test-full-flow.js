/**
 * 全流程测试脚本
 * 模拟完整的业务流程：入库 → 销售 → 退货
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  const prefix = {
    'info': 'ℹ️ ',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️ ',
    'test': '🧪'
  }[type] || 'ℹ️ ';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function recordTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    log(`${name} - 通过`, 'success');
  } else {
    testResults.failed++;
    log(`${name} - 失败: ${details}`, 'error');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  log('测试健康检查接口...', 'test');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    recordTest('健康检查', response.status === 200 && response.data.status === 'ok');
    return true;
  } catch (error) {
    recordTest('健康检查', false, error.message);
    return false;
  }
}

async function testLogin() {
  log('测试用户登录...', 'test');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.code === 0 && response.data.data.token) {
      recordTest('用户登录', true);
      return response.data.data.token;
    } else {
      recordTest('用户登录', false, '返回数据格式错误');
      return null;
    }
  } catch (error) {
    recordTest('用户登录', false, error.message);
    return null;
  }
}

async function testGetStats(token) {
  log('测试获取统计数据...', 'test');
  try {
    const response = await axios.get(`${BASE_URL}/api/stats/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    recordTest('获取统计数据', response.data.code === 0);
    log(`统计数据: ${JSON.stringify(response.data.data)}`, 'info');
    return response.data.data;
  } catch (error) {
    recordTest('获取统计数据', false, error.message);
    return null;
  }
}

async function testGetLogs(token) {
  log('测试获取日志列表...', 'test');
  try {
    const response = await axios.get(`${BASE_URL}/api/logs`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, pageSize: 10 }
    });
    
    recordTest('获取日志列表', response.data.code === 0 && response.data.data.list);
    log(`日志数量: ${response.data.data.total}`, 'info');
    return response.data.data;
  } catch (error) {
    recordTest('获取日志列表', false, error.message);
    return null;
  }
}

async function testInbound() {
  log('测试入库流程...', 'test');
  try {
    const response = await axios.post(`${BASE_URL}/webhook/oioc`, {
      type: 'inbound',
      data: {
        productId: 'PROD001',
        itemId: 'ITEM001',
        skuId: 'SKU001',
        quantity: 50,
        codes: Array.from({ length: 50 }, (_, i) => ({
          code: `TEST${Date.now()}${String(i).padStart(4, '0')}`,
          status: 'active'
        })),
        receiverID: 'WAREHOUSE001'
      }
    });
    
    recordTest('入库流程', response.data.code === 0 && response.data.data.success);
    return response.data;
  } catch (error) {
    recordTest('入库流程', false, error.message);
    return null;
  }
}

async function testOrderCreated() {
  log('测试订单创建流程...', 'test');
  try {
    const response = await axios.post(`${BASE_URL}/webhook/youzan`, {
      type: 'trade_TradePaid',
      data: {
        orderId: `TEST_ORDER_${Date.now()}`,
        items: [
          { productID: 'PROD001', expectedQty: 2 }
        ]
      }
    });
    
    recordTest('订单创建流程', response.data.code === 0);
    return response.data;
  } catch (error) {
    recordTest('订单创建流程', false, error.message);
    return null;
  }
}

async function testOutbound() {
  log('测试出库发货流程...', 'test');
  try {
    const response = await axios.post(`${BASE_URL}/webhook/oioc`, {
      type: 'outbound',
      data: {
        orderId: `TEST_ORDER_${Date.now()}`,
        logisticsNo: 'SF1234567890',
        codes: [
          { code: 'TEST001', status: 'active' },
          { code: 'TEST002', status: 'active' }
        ],
        itemId: 'ITEM001',
        skuId: 'SKU001'
      }
    });
    
    recordTest('出库发货流程', response.data.code === 0 && response.data.data.success);
    return response.data;
  } catch (error) {
    recordTest('出库发货流程', false, error.message);
    return null;
  }
}

async function testRefund() {
  log('测试退货流程...', 'test');
  try {
    const response = await axios.post(`${BASE_URL}/webhook/youzan`, {
      type: 'trade_TradeRefundCreated',
      data: {
        orderId: `TEST_ORDER_${Date.now()}`,
        refundId: `REFUND_${Date.now()}`,
        items: [
          { productID: 'PROD001', expectedQty: 1 }
        ]
      }
    });
    
    recordTest('退货流程', response.data.code === 0);
    return response.data;
  } catch (error) {
    recordTest('退货流程', false, error.message);
    return null;
  }
}

async function testReturnComplete() {
  log('测试退货完成流程...', 'test');
  try {
    const response = await axios.post(`${BASE_URL}/webhook/oioc`, {
      type: 'return_complete',
      data: {
        orderId: `TEST_ORDER_${Date.now()}`,
        codes: [
          { code: 'TEST001', status: 'returned' }
        ],
        itemId: 'ITEM001',
        skuId: 'SKU001'
      }
    });
    
    recordTest('退货完成流程', response.data.code === 0 && response.data.data.success);
    return response.data;
  } catch (error) {
    recordTest('退货完成流程', false, error.message);
    return null;
  }
}

async function testQueryCode(token) {
  log('测试防伪码查询...', 'test');
  try {
    const response = await axios.get(`${BASE_URL}/api/query/code/TEST001`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    recordTest('防伪码查询', response.data.code === 0);
    return response.data;
  } catch (error) {
    recordTest('防伪码查询', false, error.message);
    return null;
  }
}

async function testUserManagement(token) {
  log('测试用户管理...', 'test');
  try {
    const response = await axios.get(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    recordTest('用户管理', response.data.code === 0 && Array.isArray(response.data.data));
    return response.data;
  } catch (error) {
    recordTest('用户管理', false, error.message);
    return null;
  }
}

function printSummary() {
  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================');
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📊 总计: ${testResults.passed + testResults.failed}`);
  console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  console.log('========================================\n');
  
  if (testResults.failed > 0) {
    console.log('失败的测试:');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  ❌ ${t.name}: ${t.details}`);
    });
    console.log('');
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('  开始全流程测试');
  console.log('========================================\n');
  
  const startTime = Date.now();
  
  try {
    await testHealthCheck();
    await sleep(500);
    
    const token = await testLogin();
    if (!token) {
      log('登录失败，无法继续后续测试', 'error');
      printSummary();
      return;
    }
    
    await sleep(500);
    await testGetStats(token);
    await sleep(500);
    await testGetLogs(token);
    await sleep(500);
    await testUserManagement(token);
    await sleep(500);
    
    log('\n开始测试业务流程...', 'info');
    await testInbound();
    await sleep(500);
    await testOrderCreated();
    await sleep(500);
    await testOutbound();
    await sleep(500);
    await testRefund();
    await sleep(500);
    await testReturnComplete();
    await sleep(500);
    await testQueryCode(token);
    
  } catch (error) {
    log(`测试执行出错: ${error.message}`, 'error');
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`\n测试耗时: ${duration}秒`, 'info');
  
  printSummary();
  
  log('提示: 请访问 http://localhost:3000 查看管理后台', 'info');
}

if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
