const oiocClient = require('../../src/clients/oioc');

async function queryProducts() {
  console.log('====================================');
  console.log('查询第三方一物一码系统中的所有产品');
  console.log('====================================\n');
  
  try {
    // 查询所有产品
    const result = await oiocClient.getProduct();
    
    console.log('查询结果:');
    console.log(JSON.stringify(result, null, 2));
    
    // 如果有产品数据，显示产品列表
    if (result && result.data && Array.isArray(result.data)) {
      console.log('\n====================================');
      console.log('产品列表');
      console.log('====================================');
      
      result.data.forEach((product, index) => {
        console.log(`\n产品 ${index + 1}:`);
        console.log(`  产品ID: ${product.productID || product.product_id || '未知'}`);
        console.log(`  产品编号: ${product.productCode || product.product_code || '未知'}`);
        console.log(`  产品名称: ${product.productName || product.product_name || '未知'}`);
        console.log(`  规格: ${product.standard || '未知'}`);
      });
      
      console.log(`\n总计: ${result.data.length} 个产品`);
    } else if (result && result.data) {
      console.log('\n产品数据:');
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log('\n暂无产品数据');
    }
    
    return result;
  } catch (error) {
    console.error('查询产品失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
}

queryProducts().catch(console.error);
