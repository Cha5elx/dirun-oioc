require('dotenv').config();

const config = {
  youzan: {
    clientId: process.env.YOUZAN_CLIENT_ID,
    clientSecret: process.env.YOUZAN_CLIENT_SECRET,
    grantId: process.env.YOUZAN_GRANT_ID,
    dryRun: process.env.YOUZAN_DRY_RUN === 'true',
    signSecret: process.env.YOUZAN_SIGN_SECRET,
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
};

module.exports = config;
