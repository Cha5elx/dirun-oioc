const oiocClient = require('../../src/clients/oioc');

async function testLogin() {
  console.log('\n=== 测试登录接口 ===');
  try {
    const result = await oiocClient.login();
    console.log('✅ 登录成功');
    console.log('Token:', result.token || result.access_token || 'Token已保存');
    return true;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return false;
  }
}

async function testGetProduct() {
  console.log('\n=== 测试查询产品接口 ===');
  try {
    const result = await oiocClient.getProduct();
    console.log('✅ 查询产品成功');
    console.log('产品数量:', result.data ? result.data.length : 0);
    return true;
  } catch (error) {
    console.error('❌ 查询产品失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return false;
  }
}

async function testCreateProduct() {
  console.log('\n=== 测试创建产品接口 ===');
  try {
    const productData = {
      productID: 'TEST_PRODUCT_001',
      productCode: 'CODE_001',
      productName: '测试产品',
      standard: '50ml',
    };
    
    const result = await oiocClient.createProduct(productData);
    console.log('✅ 创建产品成功');
    console.log('产品ID:', result.productID || productData.productID);
    return true;
  } catch (error) {
    console.error('❌ 创建产品失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return false;
  }
}

async function testGetAgent() {
  console.log('\n=== 测试查询代理商接口 ===');
  try {
    const result = await oiocClient.getAgent();
    console.log('✅ 查询代理商成功');
    console.log('代理商数量:', result.data ? result.data.length : 0);
    return true;
  } catch (error) {
    console.error('❌ 查询代理商失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('====================================');
  console.log('开始测试第三方一物一码API');
  console.log('====================================');
  
  const results = [];
  
  // 测试登录（必须先登录）
  const loginSuccess = await testLogin();
  results.push({ test: '登录', success: loginSuccess });
  
  if (loginSuccess) {
    // 登录成功后测试其他接口
    results.push({ test: '查询产品', success: await testGetProduct() });
    results.push({ test: '创建产品', success: await testCreateProduct() });
    results.push({ test: '查询代理商', success: await testGetAgent() });
  } else {
    console.log('\n⚠️  登录失败，跳过其他测试');
  }
  
  // 输出测试结果汇总
  console.log('\n====================================');
  console.log('测试结果汇总');
  console.log('====================================');
  results.forEach(({ test, success }) => {
    console.log(`${success ? '✅' : '❌'} ${test}: ${success ? '成功' : '失败'}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n总计: ${successCount}/${results.length} 个测试通过`);
}

runTests().catch(console.error);
