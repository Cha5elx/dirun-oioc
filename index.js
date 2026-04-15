const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const path = require('path');
const config = require('./src/config');
const router = require('./src/routes');
const { initDatabase } = require('./src/models');

const app = new Koa();

app.use(bodyParser());

const publicPath = path.join(__dirname, 'public');
app.use(serve(publicPath));

app.use(router.routes()).use(router.allowedMethods());

app.use(async (ctx) => {
  if (!ctx.path.startsWith('/api') && !ctx.path.startsWith('/webhook') && !ctx.path.startsWith('/health')) {
    ctx.type = 'html';
    ctx.body = require('fs').createReadStream(path.join(publicPath, 'index.html'));
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
