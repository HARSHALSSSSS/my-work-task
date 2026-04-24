const { Router } = require('express');
const controller = require('../controllers/order.controller');
const validate = require('../../../../shared/middlewares/validate.middleware');
const { createOrderSchema } = require('../validators/order.validator');
const { adminOnly, staffOrAdmin } = require('../middlewares/admin.middleware');

const router = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Order created
 */
router.post('/', validate(createOrderSchema), controller.createOrder);
router.get('/summary', controller.getMyOrderSummary);
router.get('/my-orders', controller.getMyOrders);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated order list
 */
router.get('/', controller.getMyOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order data
 */
router.get('/:id', controller.getOrder);

/**
 * @swagger
 * /api/orders/{id}/edit-window:
 *   get:
 *     summary: Get the customer's editable window before production starts
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Edit window details
 */
router.get('/:id/edit-window', controller.getEditWindow);

/**
 * @swagger
 * /api/orders/{id}/before-production:
 *   patch:
 *     summary: Update or cancel an order before production starts
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order updated before production
 */
router.patch('/:id/before-production', controller.updateBeforeProduction);

/**
 * @swagger
 * /api/orders/{id}/clarification/respond:
 *   post:
 *     summary: Respond to an active clarification request
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clarification response recorded
 */
router.post('/:id/clarification/respond', controller.respondClarification);

/**
 * @swagger
 * /api/orders/{id}/clarification/request:
 *   post:
 *     summary: Request clarification from the customer (staff or admin)
 *     tags: [Orders Internal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clarification request created
 */
router.post('/:id/clarification/request', staffOrAdmin, controller.requestClarification);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status (admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', adminOnly, controller.updateStatus);

/**
 * @swagger
 * /api/orders/{id}/delivery-status:
 *   patch:
 *     summary: Update delivery status (internal — called by delivery-service)
 *     tags: [Orders Internal]
 *     responses:
 *       200:
 *         description: Delivery status updated
 */
router.patch('/:id/delivery-status', controller.updateDeliveryStatus);

/**
 * @swagger
 * /api/orders/{id}/track:
 *   get:
 *     summary: Track order status and timeline
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order tracking info with timeline
 */
router.get('/:id/track', controller.trackOrder);

/**
 * @swagger
 * /api/orders/{id}/reorder:
 *   post:
 *     summary: Reorder a previous order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: New order created from previous
 */
router.post('/:id/reorder', controller.reorder);

module.exports = router;
