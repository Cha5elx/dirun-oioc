const jwt = require('jsonwebtoken');
const config = require('../config');

function getJwtSecret() {
  if (!config.jwt.secret) {
    throw new Error('JWT_SECRET 环境变量未设置，请在 .env 文件中配置');
  }
  return config.jwt.secret;
}

function authMiddleware(ctx, next) {
  const authorization = ctx.headers.authorization;
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = {
      code: 401,
      message: '未登录或登录已过期'
    };
    return;
  }
  
  const token = authorization.slice(7);
  
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    ctx.state.user = decoded;
    return next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = {
      code: 401,
      message: '登录已过期，请重新登录'
    };
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: config.jwt.expiresIn }
  );
}

module.exports = {
  authMiddleware,
  generateToken,
  getJwtSecret
};
