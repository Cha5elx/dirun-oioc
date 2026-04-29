/**
 * 诊断有赞API响应数据结构
 * 在服务器上运行此脚本查看真实的API响应
 */
const youzanClient = require('../../src/clients/youzan');

async function debugResponse() {
  console.log('====================================');
  console.log('诊断有赞API响应结构');
  console.log('====================================');

  try {
    const result = await youzanClient.getOrders({
      page: 1,
      pageSize: 5,
    });

    console.log('\n=== 完整响应（前2000字符）===');
    const resultStr = JSON.stringify(result);
    console.log(resultStr.substring(0, 2000));

    console.log('\n=== 数据结构分析 ===');
    console.log('result 类型:', typeof result);
    console.log('result 键:', Object.keys(result));

    // 检查 response
    if (result.response) {
      console.log('\nresult.response 键:', Object.keys(result.response));
      console.log('result.response.trades 存在:', !!result.response.trades);
      console.log('result.response.total_results:', result.response.total_results);
      console.log('result.response.total_results 类型:', typeof result.response.total_results);

      if (result.response.trades) {
        console.log('result.response.trades 类型:', typeof result.response.trades);
        console.log('result.response.trades 长度:', result.response.trades.length);
        if (result.response.trades.length > 0) {
          console.log('\n第一个订单的键:', Object.keys(result.response.trades[0]));
        }
      }
    }

    // 检查 data
    if (result.data) {
      console.log('\nresult.data 键:', Object.keys(result.data));
    }

    // 检查是否有 items
    if (result.items) {
      console.log('\nresult.items 存在，长度:', result.items.length);
    }

    // 检查是否有 trades 直接在 result 下
    if (result.trades) {
      console.log('\nresult.trades 存在，长度:', result.trades.length);
    }

  } catch (error) {
    console.error('查询失败:', error.message);
  }
}

debugResponse();
