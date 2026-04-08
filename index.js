const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const config = require('./src/config');
const router = require('./src/routes');

const app = new Koa();

app.use(bodyParser());

app.use(router.routes()).use(router.allowedMethods());

app.listen(config.server.port, () => {
  console.log(`服务器运行在端口 ${config.server.port}`);
  console.log(`环境: ${config.server.env}`);
  console.log(`健康检查: http://localhost:${config.server.port}/health`);
  console.log(`有赞Webhook: http://localhost:${config.server.port}/webhook/youzan`);
  console.log(`OIOC Webhook: http://localhost:${config.server.port}/webhook/oioc`);
});
