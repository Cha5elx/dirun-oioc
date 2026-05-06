/**
 * 批量导入有赞商品到 OIOC 系统
 * 用法: node scripts/import-products.js
 */
const path = require('path');
const oiocClient = require('../src/clients/oioc');

const JSON_PATH = path.join(__dirname, '..', 'tests', 'api', 'youzan-products.json');
const DELAY_MS = 200; // 每个请求间隔，避免打爆 API

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const data = require(JSON_PATH);
  const items = data.items;
  console.log(`共 ${items.length} 条商品待导入\n`);

  let success = 0;
  let fail = 0;
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const productData = {
      productID: String(item.item_id),
      productCode: item.item_code || '',
      productName: item.title || '',
      standard: '',
    };

    try {
      const result = await oiocClient.createProduct(productData);
      success++;
      console.log(`[${i + 1}/${items.length}] OK  ${productData.productID}  ${productData.productName}`);
    } catch (err) {
      fail++;
      const msg = err.response?.data?.message || err.message || String(err);
      console.error(`[${i + 1}/${items.length}] FAIL ${productData.productID}  ${productData.productName}  — ${msg}`);
      errors.push({ productID: productData.productID, productName: productData.productName, error: msg });
    }

    if (i < items.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n========== 导入完成 ==========`);
  console.log(`成功: ${success}`);
  console.log(`失败: ${fail}`);

  if (errors.length > 0) {
    console.log(`\n失败明细:`);
    errors.forEach(e => console.log(`  ${e.productID}  ${e.productName}  — ${e.error}`));
  }
}

main().catch(err => {
  console.error('导入脚本异常:', err);
  process.exit(1);
});
