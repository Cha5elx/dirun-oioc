const jwt = require('jsonwebtoken');
const config = require('../config');

const ROLE_HIERARCHY = {
  admin: 3,
  operator: 2,
  viewer: 1
};

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
      success: false,
      message: '未登录或登录已过期',
      code: 'AUTH_ERROR',
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
      success: false,
      message: '登录已过期，请重新登录',
      code: 'AUTH_ERROR',
    };
  }
}

function roleMiddleware(requiredRole) {
  return async (ctx, next) => {
    const userRole = ctx.state.user?.role || 'viewer';
    
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    
    if (userLevel < requiredLevel) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，无法执行此操作',
        code: 'FORBIDDEN',
      };
      return;
    }
    
    return next();
  };
}

function hasRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

function isAdmin(ctx) {
  return ctx.state.user?.role === 'admin';
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
  roleMiddleware,
  hasRole,
  isAdmin,
  generateToken,
  getJwtSecret,
  ROLE_HIERARCHY
};
