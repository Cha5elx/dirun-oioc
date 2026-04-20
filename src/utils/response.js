const config = require('../config');

const isProduction = () => config.server.env === 'production';

function success(ctx, data, message = '操作成功') {
  ctx.body = {
    success: true,
    message,
    data,
  };
}

function error(ctx, message, statusCode = 500, code = 'INTERNAL_ERROR') {
  ctx.status = statusCode;
  ctx.body = {
    success: false,
    message,
    code,
  };
}

function errorWithDetail(ctx, err, statusCode = 500, code = 'INTERNAL_ERROR') {
  ctx.status = statusCode;
  
  if (isProduction()) {
    ctx.body = {
      success: false,
      message: '服务器内部错误，请稍后重试',
      code,
    };
  } else {
    ctx.body = {
      success: false,
      message: err.message || '服务器内部错误',
      code,
      detail: err.stack,
    };
  }
}

function paramError(ctx, message) {
  ctx.status = 400;
  ctx.body = {
    success: false,
    message,
    code: 'PARAM_ERROR',
  };
}

function authError(ctx, message = '认证失败') {
  ctx.status = 401;
  ctx.body = {
    success: false,
    message,
    code: 'AUTH_ERROR',
  };
}

function notFoundError(ctx, message = '资源不存在') {
  ctx.status = 404;
  ctx.body = {
    success: false,
    message,
    code: 'NOT_FOUND',
  };
}

function logError(err, context = '') {
  const timestamp = new Date().toISOString();
  const prefix = context ? `[${timestamp}] [${context}]` : `[${timestamp}]`;
  console.error(`${prefix} 错误:`, err.message);
  if (!isProduction() && err.stack) {
    console.error(err.stack);
  }
}

module.exports = {
  success,
  error,
  errorWithDetail,
  paramError,
  authError,
  notFoundError,
  logError,
  isProduction,
};
