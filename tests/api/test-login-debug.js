const axios = require('axios');
const config = require('../../src/config');

async function testLogin() {
  try {
    const axiosInstance = axios.create({
      baseURL: config.oioc.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'syskey': 'DIRUN',
      },
    });

    console.log('发送登录请求...');
    const response = await axiosInstance.post('/login/access-token', {
      account: config.oioc.username,
      password: config.oioc.password,
      type: 'PDA',
    });
    
    console.log('\n完整响应数据:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n响应数据的键:', Object.keys(response.data));
    
    if (response.data.data) {
      console.log('\ndata字段的键:', Object.keys(response.data.data));
    }
    
  } catch (error) {
    console.error('错误:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testLogin();
