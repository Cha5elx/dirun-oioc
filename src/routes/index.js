const Router = require('koa-router');
const webhookController = require('../controllers/webhook');
const adminController = require('../controllers/admin');
const { authMiddleware } = require('../middleware/auth');

const router = new Router();

// 有赞Webhook回调地址
router.post('/webhook/youzan', webhookController.handleYouzanWebhook);

// 第三方一物一码Webhook回调地址
router.post('/webhook/oioc', webhookController.handleOiocWebhook);

// 健康检查
router.get('/health', webhookController.healthCheck);

// 管理后台API
// 认证
router.post('/api/auth/login', adminController.login);

// 需要认证的接口
router.get('/api/users', authMiddleware, adminController.getUsers);
router.post('/api/users', authMiddleware, adminController.createUser);
router.put('/api/users/:id', authMiddleware, adminController.updateUser);
router.post('/api/users/:id/reset-password', authMiddleware, adminController.resetPassword);
router.delete('/api/users/:id', authMiddleware, adminController.deleteUser);

router.get('/api/logs', authMiddleware, adminController.getLogs);
router.get('/api/stats/summary', authMiddleware, adminController.getStats);
router.get('/api/query/code/:code', authMiddleware, adminController.queryCode);

module.exports = router;
