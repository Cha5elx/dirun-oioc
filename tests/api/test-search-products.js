/**
 * 测试有赞批量查询商品列表 API
 * API: youzan.item.base.search 1.0.0
 */
const youzanClient = require('../../src/clients/youzan');
const path = require('path');
const fs = require('fs');

async function searchAllProducts() {
  console.log('=== 有赞批量查询商品列表 ===\n');

  // 获取 token
  console.log('1. 获取 access_token...');
  await youzanClient.getToken();
  console.log('   Token 获取成功\n');

  // 查询第一页，看总共多少条
  console.log('2. 查询商品列表...');
  const firstPage = await youzanClient.callApi('youzan.item.base.search', '1.0.0', {
    channel: 0,
    kdt_id: String(youzanClient.grantId),
    page_no: '1',
    page_size: '50',
  });

  if (!firstPage.success) {
    console.error('查询失败:', firstPage.message);
    process.exit(1);
  }

  const paginator = firstPage.data.paginator;
  const totalCount = paginator.total_count;
  const totalPages = Math.ceil(totalCount / 50);

  console.log(`   商品总数: ${totalCount}`);
  console.log(`   总页数: ${totalPages}`);

  // 收集所有商品
  let allItems = [...firstPage.data.items];
  console.log(`   第 1 页获取: ${firstPage.data.items.length} 条`);

  // 逐页获取剩余数据
  for (let page = 2; page <= totalPages; page++) {
    const result = await youzanClient.callApi('youzan.item.base.search', '1.0.0', {
      channel: 0,
      kdt_id: String(youzanClient.grantId),
      page_no: String(page),
      page_size: '50',
    });

    if (result.success) {
      allItems = allItems.concat(result.data.items);
      console.log(`   第 ${page} 页获取: ${result.data.items.length} 条`);
    }
  }

  console.log(`\n   实际获取: ${allItems.length} 条商品\n`);

  // 输出摘要
  console.log('3. 商品摘要:');
  console.log('-'.repeat(70));
  allItems.forEach((item, i) => {
    const price = item.price ? (item.price / 100).toFixed(2) : '0.00';
    console.log(`${i + 1}. [${item.item_id}] ${item.title} - ¥${price}`);
  });

  // 保存 JSON 文件
  const outputPath = path.join(__dirname, 'youzan-products.json');
  const output = {
    totalCount,
    fetchedCount: allItems.length,
    fetchedAt: new Date().toISOString(),
    items: allItems,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n4. 完整结果已保存到: ${outputPath}`);

  return output;
}

searchAllProducts().catch((err) => {
  console.error('执行失败:', err.message);
  process.exit(1);
});
