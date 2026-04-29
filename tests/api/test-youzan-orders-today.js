/**
 * 测试查询有赞今日订单
 */
const youzanClient = require('../../src/clients/youzan');

function getBeijingDateString(date) {
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  const hours = String(beijingTime.getUTCHours()).padStart(2, '0');
  const minutes = String(beijingTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(beijingTime.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function testTodayOrders() {
  console.log('====================================');
  console.log('测试查询有赞今日订单');
  console.log('====================================');

  try {
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startCreated = getBeijingDateString(today);
    const endCreated = getBeijingDateString(tomorrow);

    console.log('查询时间范围:', startCreated, '至', endCreated);

    const result = await youzanClient.getOrders({
      page: 1,
      pageSize: 20,
      startCreated,
      endCreated,
    });

    console.log('API响应结果:');
    console.log(JSON.stringify(result, null, 2));

    const response = result.response || {};
    const trades = response.trades || [];
    const total = response.total_results || 0;

    console.log('\n订单总数:', total);
    console.log('本次返回订单数:', trades.length);

    if (trades.length > 0) {
      console.log('\n第一个订单示例:');
      console.log(JSON.stringify(trades[0], null, 2));
    } else {
      console.log('\n今日暂无订单');
    }

  } catch (error) {
    console.error('查询失败:', error.message);
    console.error(error.stack);
  }
}

async function testAllOrders() {
  console.log('\n====================================');
  console.log('测试查询所有订单（不限制时间）');
  console.log('====================================');

  try {
    const result = await youzanClient.getOrders({
      page: 1,
      pageSize: 20,
    });

    console.log('API响应结果:');
    console.log(JSON.stringify(result, null, 2));

    const response = result.response || {};
    const trades = response.trades || [];
    const total = response.total_results || 0;

    console.log('\n订单总数:', total);
    console.log('本次返回订单数:', trades.length);

    if (trades.length > 0) {
      console.log('\n第一个订单示例:');
      console.log(JSON.stringify(trades[0], null, 2));
    } else {
      console.log('\n暂无订单');
    }

  } catch (error) {
    console.error('查询失败:', error.message);
    console.error(error.stack);
  }
}

async function runTests() {
  await testTodayOrders();
  await testAllOrders();
}

runTests();
