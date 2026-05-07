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
const logger = require('./src/utils/logger');
const { startCleanupTask, getCleanupStats } = require('./src/services/cleanup');

process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET' || err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
    return;
  }
  logger.error('未捕获的异常', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  if (reason && (reason.code === 'EPIPE' || reason.code === 'ECONNRESET' || reason.code === 'ERR_STREAM_PREMATURE_CLOSE')) {
    logger.warn('客户端连接提前关闭，忽略Promise错误', { code: reason.code || reason.message });
    return;
  }
  logger.error('未处理的Promise拒绝', { reason: reason?.message || reason });
});

const app = new Koa();

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err.code === 'EPIPE' || err.code === 'ECONNRESET' || err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      logger.warn('客户端连接提前关闭', { path: ctx.path });
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
  logger.warn('生产环境下 CORS_ORIGIN 不应设置为 "*"，请配置具体的允许域名');
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
    logger.error('致命错误：JWT_SECRET 环境变量未设置。请在 .env 文件中配置一个强随机密钥（至少32位）。');
    process.exit(1);
  }
  
  const dbReady = await initDatabase();
  if (!dbReady) {
    logger.error('数据库初始化失败，服务启动终止');
    process.exit(1);
  }
  
  if (isProduction()) {
    try {
      const stats = await getCleanupStats();
      logger.info('日志统计', {
        totalLogs: stats.totalLogs,
        dbSize: stats.dbSizeFormatted,
        earliestRecord: stats.earliestRecord,
        latestRecord: stats.latestRecord
      });
      
      startCleanupTask({
        scheduleHour: 3,
        daysToKeep: 30,
        maxLogCount: 10000,
        enableVacuum: true
      });
      
      logger.info('日志清理定时任务已启动（每天凌晨 3 点执行）');
    } catch (err) {
      logger.error('启动日志清理任务失败', { error: err.message });
    }
  }
  
  app.listen(config.server.port, () => {
    logger.info('服务器启动成功', {
      port: config.server.port,
      env: config.server.env,
      healthCheck: `http://localhost:${config.server.port}/health`,
      youzanWebhook: `http://localhost:${config.server.port}/webhook/youzan`,
      oiocWebhook: `http://localhost:${config.server.port}/webhook/oioc`,
      adminPanel: `http://localhost:${config.server.port}`
    });
  });
}

start();
