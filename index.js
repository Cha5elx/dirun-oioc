const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const path = require('path');
const fs = require('fs');
const config = require('./src/config');
const router = require('./src/routes');
const { initDatabase } = require('./src/models');

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
    
    console.error(`[${new Date().toISOString()}] 请求错误:`, err.message);
    ctx.status = err.status || 500;
    ctx.body = {
      code: -1,
      msg: err.message || '服务器内部错误',
    };
  }
});

app.use(bodyParser());

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
