const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dirun-oioc-secret-key-2024';

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
    const decoded = jwt.verify(token, JWT_SECRET);
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
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  authMiddleware,
  generateToken,
  JWT_SECRET
};
