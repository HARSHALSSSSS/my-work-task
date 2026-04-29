const { Router } = require('express');
const c = require('../controllers/vendor-order.controller');
const { vendorOnly } = require('../middlewares/vendor.middleware');

const router = Router();
router.use(vendorOnly);

/**
 * @swagger
 * tags:
 *   - name: Vendor Orders
 *     description: Vendor order lifecycle management
 */

/**
 * @swagger
 * /api/vendor/orders/queue:
 *   get:
 *     summary: Get vendor order queue (assigned orders awaiting action)
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [assigned_vendor, vendor_accepted, in_production, qc_pending, ready_for_pickup]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated order queue
 */
/**
 * @swagger
 * /queue:
 *   get:
 *     summary: GET /queue
 *     tags: [Vendor-order]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/queue', c.getQueue);

/**
 * @swagger
 * /api/vendor/orders/score:
 *   get:
 *     summary: Get vendor performance score
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor score metrics
 */
router.get('/score', c.getVendorScore);

/**
 * @swagger
 * /api/vendor/orders/closure:
 *   get:
 *     summary: Get vendor closure report
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Closure report with earnings and job stats
 */
/**
 * @swagger
 * /closure:
 *   get:
 *     summary: GET /closure
 *     tags: [Vendor-order]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/closure', c.getVendorClosure);

/**
 * @swagger
 * /api/vendor/orders/assigned:
 *   get:
 *     summary: Get vendor assigned orders
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assigned orders list
 */
router.get('/assigned', c.getAssigned);

/**
 * @swagger
 * /api/vendor/orders/{id}:
 *   get:
 *     summary: Get a specific vendor order
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get('/:id', c.getVendorOrder);

/**
 * @swagger
 * /api/vendor/orders/{id}/accept:
 *   post:
 *     summary: Accept an assigned order
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order accepted — status becomes vendor_accepted
 */
router.post('/:id/accept', c.acceptOrder);

/**
 * @swagger
 * /api/vendor/orders/{id}/reject:
 *   post:
 *     summary: Reject an assigned order
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Order rejected — status becomes cancelled
 */
/**
 * @swagger
 * /{id}/reject:
 *   post:
 *     summary: POST /{id}/reject
 *     tags: [Vendor-order]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/:id/reject', c.rejectOrder);

/**
 * @swagger
 * /api/vendor/orders/{id}/start-production:
 *   patch:
 *     summary: Start production on an accepted order
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status becomes in_production
 */
router.patch('/:id/start-production', c.startProduction);

/**
 * @swagger
 * /api/vendor/orders/{id}/qc-pending:
 *   patch:
 *     summary: Mark order as QC pending
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status becomes qc_pending
 */
router.patch('/:id/qc-pending', c.markQcPending);

/**
 * @swagger
 * /api/vendor/orders/{id}/ready-for-pickup:
 *   patch:
 *     summary: Mark order as ready for delivery pickup
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status becomes ready_for_pickup
 */
router.patch('/:id/ready-for-pickup', c.markReadyForPickup);

/**
 * @swagger
 * /api/vendor/orders/{id}/status:
 *   post:
 *     summary: Update order status
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Order status updated
 */
/**
 * @swagger
 * /{id}/status:
 *   post:
 *     summary: POST /{id}/status
 *     tags: [Vendor-order]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/:id/status', c.updateStatus);

/**
 * @swagger
 * /api/vendor/orders/{id}/qc-upload:
 *   post:
 *     summary: Upload QC evidence
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images: 
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: QC uploaded
 */
/**
 * @swagger
 * /{id}/qc-upload:
 *   post:
 *     summary: POST /{id}/qc-upload
 *     tags: [Vendor-order]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/:id/qc-upload', c.qcUpload);

/**
 * @swagger
 * /api/vendor/orders/{id}/ready:
 *   post:
 *     summary: Mark order as ready for pickup (alias)
 *     tags: [Vendor Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status becomes ready_for_pickup
 */
router.post('/:id/ready', c.markReadyForPickup);

module.exports = router;
