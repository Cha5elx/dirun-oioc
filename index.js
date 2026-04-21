const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const cors = require('@koa/cors');
const rateLimit = require('koa-ratelimit');
const path = require('path');
const fs = require('fs');
const config = require('./src/config');
const router = require('./src/routes');
const { initDatabase } = require('./src/models');
const { isProduction, logError } = require('./src/utils/response');

process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
    console.log('客户端连接提前关闭，忽略错误:', err.code);
    return;
  }
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  if (reason && (reason.code === 'EPIPE' || reason.code === 'ECONNRESET' || reason.code === 'ERR_STREAM_PREMATURE_CLOSE')) {
    console.log('客户端连接提前关闭，忽略Promise错误:', reason.code || reason.message);
    return;
  }
  console.error('未处理的Promise拒绝:', reason);
});

const app = new Koa();

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err.code === 'EPIPE' || err.code === 'ECONNRESET' || err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      console.log(`[${new Date().toISOString()}] 客户端连接提前关闭: ${ctx.path}`);
      return;
    }
    
    logError(err, '全局错误');
    
    ctx.status = err.status || 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '服务器内部错误，请稍后重试',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: err.message || '服务器内部错误',
        code: 'INTERNAL_ERROR',
        detail: err.stack,
      };
    }
  }
});

if (config.security.corsOrigin === '*' && isProduction()) {
  console.warn('警告: 生产环境下 CORS_ORIGIN 不应设置为 "*"，请配置具体的允许域名');
}

app.use(cors({
  origin: config.security.corsOrigin,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const rateLimitStore = new Map();

const globalRateLimit = rateLimit({
  driver: 'memory',
  db: rateLimitStore,
  duration: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  id: (ctx) => ctx.ip,
  errorMessage: JSON.stringify({
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED',
  }),
  disableHeader: false,
});

const webhookRateLimitStore = new Map();

const webhookRateLimit = rateLimit({
  driver: 'memory',
  db: webhookRateLimitStore,
  duration: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.webhookMax,
  id: (ctx) => ctx.ip,
  errorMessage: JSON.stringify({
    success: false,
    message: 'Webhook 请求过于频繁，请稍后再试',
    code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
  }),
  disableHeader: false,
});

app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/webhook')) {
    return webhookRateLimit(ctx, next);
  }
  return globalRateLimit(ctx, next);
});

app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/webhook')) {
    const chunks = [];
    for await (const chunk of ctx.req) {
      chunks.push(chunk);
    }
    ctx.request.rawBody = Buffer.concat(chunks).toString('utf-8');
    try {
      ctx.request.body = JSON.parse(ctx.request.rawBody);
    } catch (e) {
      ctx.request.body = {};
    }
    await next();
  } else {
    await next();
  }
});

app.use(bodyParser({
  jsonLimit: config.security.maxRequestBodySize,
  formLimit: config.security.maxRequestBodySize,
}));

const publicPath = path.join(__dirname, 'public');
app.use(serve(publicPath));

app.use(router.routes()).use(router.allowedMethods());

app.use(async (ctx) => {
  if (!ctx.path.startsWith('/api') && !ctx.path.startsWith('/webhook') && !ctx.path.startsWith('/health')) {
    ctx.type = 'html';
    ctx.body = await fs.promises.readFile(path.join(publicPath, 'index.html'));
  }
});

async function start() {
  if (!config.jwt.secret) {
    console.error('致命错误：JWT_SECRET 环境变量未设置。请在 .env 文件中配置一个强随机密钥（至少32位）。');
    process.exit(1);
  }
  
  const dbReady = await initDatabase();
  if (!dbReady) {
    console.error('数据库初始化失败，服务启动终止');
    process.exit(1);
  }
  
  app.listen(config.server.port, () => {
    console.log(`服务器运行在端口 ${config.server.port}`);
    console.log(`环境: ${config.server.env}`);
    console.log(`健康检查: http://localhost:${config.server.port}/health`);
    console.log(`有赞Webhook: http://localhost:${config.server.port}/webhook/youzan`);
    console.log(`OIOC Webhook: http://localhost:${config.server.port}/webhook/oioc`);
    console.log(`管理后台: http://localhost:${config.server.port}`);
  });
}

start();
