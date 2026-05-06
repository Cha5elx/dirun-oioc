require('dotenv').config();

const config = {
  youzan: {
    clientId: process.env.YOUZAN_CLIENT_ID,
    clientSecret: process.env.YOUZAN_CLIENT_SECRET,
    grantId: process.env.YOUZAN_GRANT_ID,
    dryRun: process.env.YOUZAN_DRY_RUN === 'true',
    signSecret: process.env.YOUZAN_SIGN_SECRET,
    // 本地调试：通过服务器代理调用有赞 API（仅本地后端设置，服务器留空）
    proxyUrl: process.env.YOUZAN_PROXY_URL || '',
    proxySecret: process.env.YOUZAN_PROXY_SECRET || '',
  },
  oioc: {
    baseUrl: process.env.OIOC_BASE_URL,
    username: process.env.OIOC_USERNAME,
    password: process.env.OIOC_PASSWORD,
    signSecret: process.env.OIOC_SIGN_SECRET,
  },
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimit: {
      windowMs: 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      webhookMax: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX) || 30,
    },
    maxRequestBodySize: process.env.MAX_REQUEST_BODY_SIZE || '1mb',
  },
};

module.exports = config;
