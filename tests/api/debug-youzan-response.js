/**
 * 诊断有赞API响应结构
 */
const youzanClient = require('../../src/clients/youzan');

async function debugResponse() {
  console.log('====================================');
  console.log('诊断有赞API响应结构');
  console.log('====================================');

  try {
    // 不带时间参数，查询所有订单
    const result = await youzanClient.getOrders({
      page: 1,
      pageSize: 20,
    });

    console.log('\n=== 完整响应 ===');
    console.log(JSON.stringify(result, null, 2));

    // 检查各种可能的数据路径
    console.log('\n=== 数据结构分析 ===');
    console.log('result 类型:', typeof result);
    console.log('result 键:', Object.keys(result));

    if (result.response) {
      console.log('\nresult.response 键:', Object.keys(result.response));
      console.log('result.response.trades:', result.response.trades ? `存在，长度${result.response.trades.length}` : '不存在');
      console.log('result.response.total_results:', result.response.total_results);
    }

    if (result.data) {
      console.log('\nresult.data 键:', Object.keys(result.data));
      console.log('result.data.trades:', result.data.trades ? `存在，长度${result.data.trades.length}` : '不存在');
      console.log('result.data.items:', result.data.items ? `存在，长度${result.data.items.length}` : '不存在');
      console.log('result.data.total_results:', result.data.total_results);
    }

    if (result.trades) {
      console.log('\nresult.trades:', `存在，长度${result.trades.length}`);
    }

    // 检查错误
    if (result.gw_err_resp) {
      console.log('\n=== 错误信息 ===');
      console.log('err_code:', result.gw_err_resp.err_code);
      console.log('err_msg:', result.gw_err_resp.err_msg);
    }

  } catch (error) {
    console.error('查询失败:', error.message);
    console.error(error.stack);
  }
}

async function debugWithDateRange() {
  console.log('\n====================================');
  console.log('诊断带时间范围的查询');
  console.log('====================================');

  try {
    // 使用较大的时间范围
    const result = await youzanClient.getOrders({
      page: 1,
      pageSize: 20,
      startCreated: '2025-01-01 00:00:00',
      endCreated: '2026-12-31 23:59:59',
    });

    console.log('\n=== 完整响应 ===');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('查询失败:', error.message);
  }
}

async function runDebug() {
  await debugResponse();
  await debugWithDateRange();
}

runDebug();
