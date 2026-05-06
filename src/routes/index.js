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

router.get('/api/youzan/orders', authMiddleware, roleMiddleware('operator'), adminController.getYouzanOrders);
router.get('/api/youzan/orders/:orderId', authMiddleware, roleMiddleware('operator'), adminController.getYouzanOrderDetail);

router.get('/api/retry-queue/stats', authMiddleware, roleMiddleware('admin'), adminController.getRetryQueueStats);

// OIOC 产品管理
router.post('/api/oioc/products', authMiddleware, roleMiddleware('operator'), adminController.createOiocProduct);
router.get('/api/oioc/products', authMiddleware, roleMiddleware('operator'), adminController.getOiocProducts);

// OIOC 代理管理
router.post('/api/oioc/agents', authMiddleware, roleMiddleware('operator'), adminController.createOiocAgent);
router.get('/api/oioc/agents', authMiddleware, roleMiddleware('operator'), adminController.getOiocAgents);

// OIOC 入库单管理
router.post('/api/oioc/inbound-orders', authMiddleware, roleMiddleware('operator'), adminController.createOiocInboundOrder);
router.get('/api/oioc/inbound-orders', authMiddleware, roleMiddleware('operator'), adminController.getOiocInboundOrders);

// OIOC 出库单管理
router.post('/api/oioc/outbound-orders', authMiddleware, roleMiddleware('operator'), adminController.createOiocOutboundOrder);
router.get('/api/oioc/outbound-orders', authMiddleware, roleMiddleware('operator'), adminController.getOiocOutboundOrders);

// OIOC 退货单管理
router.post('/api/oioc/return-orders', authMiddleware, roleMiddleware('operator'), adminController.createOiocReturnOrder);
router.get('/api/oioc/return-orders', authMiddleware, roleMiddleware('operator'), adminController.getOiocReturnOrders);

// OIOC 订单条码查询
router.get('/api/oioc/orders/:orderId/barcodes', authMiddleware, roleMiddleware('operator'), adminController.getOiocOrderBarcodes);

// 有赞 API 代理（供本地后端调试用，通过共享密钥鉴权）
router.post('/api/internal/youzan-proxy', adminController.proxyYouzanApi);

module.exports = router;
