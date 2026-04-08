const Router = require('koa-router');
const webhookController = require('../controllers/webhook');

const router = new Router();

// 有赞Webhook回调地址
router.post('/webhook/youzan', webhookController.handleYouzanWebhook);

// 第三方一物一码Webhook回调地址
router.post('/webhook/oioc', webhookController.handleOiocWebhook);

// 健康检查
router.get('/health', webhookController.healthCheck);

module.exports = router;
