const youzanyun = require('youzanyun-sdk');

async function getToken() {
  try {
    const resp = await youzanyun.token.get({
      authorize_type: 'silent',
      client_id: '891289185e2cb0d394',
      client_secret: '9476911249fdb3b6fcbb1da7c766bfc1',
      grant_id: 158310016,
      refresh: true, // 是否获取refresh_token(可通过refresh_token刷新token)
    });
    
    console.log('获取到的token响应：');
    console.log(resp);
  } catch (error) {
    console.error('获取token失败：', error);
  }
}

getToken();