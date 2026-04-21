const Router = require('koa-router');
const webhookController = require('../controllers/webhook');
const adminController = require('../controllers/admin');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { verifyYouzanSignature, verifyOiocSignature } = require('../middleware/verifySignature');

const router = new Router();

router.post('/webhook/youzan', verifyYouzanSignature, webhookController.handleYouzanWebhook);

router.post('/webhook/oioc', verifyOiocSignature, webhookController.handleOiocWebhook);

router.get('/health', webhookController.healthCheck);

router.post('/api/auth/login', adminController.login);

router.get('/api/users', authMiddleware, roleMiddleware('admin'), adminController.getUsers);
router.post('/api/users', authMiddleware, roleMiddleware('admin'), adminController.createUser);
router.put('/api/users/:id', authMiddleware, roleMiddleware('admin'), adminController.updateUser);
router.post('/api/users/:id/reset-password', authMiddleware, roleMiddleware('admin'), adminController.resetPassword);
router.delete('/api/users/:id', authMiddleware, roleMiddleware('admin'), adminController.deleteUser);

router.get('/api/logs', authMiddleware, roleMiddleware('operator'), adminController.getLogs);
router.get('/api/logs/stats', authMiddleware, roleMiddleware('operator'), adminController.getLogStats);
router.post('/api/logs/cleanup', authMiddleware, roleMiddleware('admin'), adminController.triggerCleanup);
router.get('/api/stats/summary', authMiddleware, roleMiddleware('operator'), adminController.getStats);
router.get('/api/query/code/:code', authMiddleware, roleMiddleware('operator'), adminController.queryCode);

router.get('/api/product-mappings', authMiddleware, roleMiddleware('admin'), adminController.getProductMappings);
router.post('/api/product-mappings', authMiddleware, roleMiddleware('admin'), adminController.createProductMapping);
router.put('/api/product-mappings/:id', authMiddleware, roleMiddleware('admin'), adminController.updateProductMapping);
router.delete('/api/product-mappings/:id', authMiddleware, roleMiddleware('admin'), adminController.deleteProductMapping);
router.get('/api/product-mappings/search', authMiddleware, roleMiddleware('admin'), adminController.searchProductMapping);

module.exports = router;
