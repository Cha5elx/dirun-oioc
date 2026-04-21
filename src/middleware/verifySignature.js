const crypto = require('crypto');
const config = require('../config');

function getClientIP(ctx) {
  return ctx.headers['x-forwarded-for'] || 
         ctx.headers['x-real-ip'] || 
         ctx.ip || 
         'unknown';
}

function verifyYouzanSignature(ctx, next) {
  if (config.server.env === 'development') {
    console.log('⚠️  开发环境：跳过有赞签名验证');
    return next();
  }
  
  const signSecret = config.youzan.signSecret;
  
  if (!signSecret) {
    console.error('❌ 有赞签名密钥未配置 (YOUZAN_SIGN_SECRET)');
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器配置错误',
      code: 'CONFIG_ERROR',
    };
    return;
  }
  
  const timestamp = ctx.headers['x-youzan-sign-timestamp'];
  const signature = ctx.headers['x-youzan-sign'];
  
  if (!timestamp || !signature) {
    const clientIP = getClientIP(ctx);
    console.error(`❌ 有赞签名缺失 - IP: ${clientIP}, 时间: ${new Date().toISOString()}`);
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '签名验证失败',
      code: 'SIGNATURE_MISSING',
    };
    return;
  }
  
  const rawBody = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const signString = `${timestamp}\n${rawBody}`;
  
  const expectedSignature = crypto
    .createHmac('sha256', signSecret)
    .update(signString)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    const clientIP = getClientIP(ctx);
    console.error(`❌ 有赞签名不匹配 - IP: ${clientIP}, 时间: ${new Date().toISOString()}`);
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '签名验证失败',
      code: 'SIGNATURE_INVALID',
    };
    return;
  }
  
  return next();
}

function verifyOiocSignature(ctx, next) {
  if (config.server.env === 'development') {
    console.log('⚠️  开发环境：跳过OIOC签名验证');
    return next();
  }
  
  const signSecret = config.oioc.signSecret;
  
  if (!signSecret) {
    console.error('❌ OIOC签名密钥未配置 (OIOC_SIGN_SECRET)');
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器配置错误',
      code: 'CONFIG_ERROR',
    };
    return;
  }
  
  const signature = ctx.headers['x-oioc-signature'];
  const timestamp = ctx.headers['x-oioc-timestamp'];
  
  if (!signature) {
    const clientIP = getClientIP(ctx);
    console.error(`❌ OIOC签名缺失 - IP: ${clientIP}, 时间: ${new Date().toISOString()}`);
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '签名验证失败',
      code: 'SIGNATURE_MISSING',
    };
    return;
  }
  
  const rawBody = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  
  let signString = rawBody;
  if (timestamp) {
    signString = `${timestamp}\n${rawBody}`;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', signSecret)
    .update(signString)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    const clientIP = getClientIP(ctx);
    console.error(`❌ OIOC签名不匹配 - IP: ${clientIP}, 时间: ${new Date().toISOString()}`);
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '签名验证失败',
      code: 'SIGNATURE_INVALID',
    };
    return;
  }
  
  return next();
}

module.exports = {
  verifyYouzanSignature,
  verifyOiocSignature,
};
