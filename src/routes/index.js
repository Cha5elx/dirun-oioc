const Router = require('koa-router');
const webhookController = require('../controllers/webhook');
const adminController = require('../controllers/admin');
const { authMiddleware } = require('../middleware/auth');
const { verifyYouzanSignature, verifyOiocSignature } = require('../middleware/verifySignature');

const router = new Router();

router.post('/webhook/youzan', verifyYouzanSignature, webhookController.handleYouzanWebhook);

router.post('/webhook/oioc', verifyOiocSignature, webhookController.handleOiocWebhook);

router.get('/health', webhookController.healthCheck);

router.post('/api/auth/login', adminController.login);

router.get('/api/users', authMiddleware, adminController.getUsers);
router.post('/api/users', authMiddleware, adminController.createUser);
router.put('/api/users/:id', authMiddleware, adminController.updateUser);
router.post('/api/users/:id/reset-password', authMiddleware, adminController.resetPassword);
router.delete('/api/users/:id', authMiddleware, adminController.deleteUser);

router.get('/api/logs', authMiddleware, adminController.getLogs);
router.get('/api/stats/summary', authMiddleware, adminController.getStats);
router.get('/api/query/code/:code', authMiddleware, adminController.queryCode);

module.exports = router;
