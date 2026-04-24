const { Router } = require('express');
const { deliveryController } = require('../controllers/delivery.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { internalAuthMiddleware } = require('../middlewares/internal-auth.middleware');

const router = Router();

/**
 * @swagger
 * /api/delivery/internal/tasks:
 *   post:
 *     summary: Create delivery task (internal — called by order-service)
 *     tags: [Delivery Internal]
 */
router.post('/internal/tasks', internalAuthMiddleware, deliveryController.internalCreateTask);

/**
 * @swagger
 * /api/delivery/auth/send-otp:
 *   post:
 *     summary: Send OTP for delivery partner login
 *     tags: [Delivery Auth]
 */
router.post('/auth/send-otp', deliveryController.authSendOtp);

/**
 * @swagger
 * /api/delivery/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login delivery partner
 *     tags: [Delivery Auth]
 */
router.post('/auth/verify-otp', deliveryController.authVerifyOtp);

/**
 * @swagger
 * /api/delivery/me/profile:
 *   get:
 *     summary: Get delivery partner profile
 *     tags: [Delivery Profile]
 *     security:
 *       - bearerAuth: []
 *   patch:
 *     summary: Update delivery partner profile fields
 *     tags: [Delivery Profile]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me/profile', authMiddleware, deliveryController.getProfile);
router.patch('/me/profile', authMiddleware, deliveryController.updateProfile);

/**
 * @swagger
 * /api/delivery/support/incident:
 *   post:
 *     summary: Raise a new support incident/ticket
 *     tags: [Delivery Support]
 *     security:
 *       - bearerAuth: []
 */
router.post('/support/incident', authMiddleware, deliveryController.supportIncident);

/**
 * @swagger
 * /api/delivery/track/{orderId}:
 *   get:
 *     summary: Track delivery by order ID (public)
 *     tags: [Delivery]
 */
router.get('/track/:orderId', deliveryController.trackByOrder);

/**
 * @swagger
 * /api/delivery/tasks/available:
 *   get:
 *     summary: List available tasks for delivery partners
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/tasks/available', authMiddleware, deliveryController.availableTasks);

/**
 * @swagger
 * /api/delivery/tasks/current:
 *   get:
 *     summary: Get current active task for rider
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/tasks/current', authMiddleware, deliveryController.currentTask);

/**
 * @swagger
 * /api/delivery/tasks/mine:
 *   get:
 *     summary: Get all tasks for current rider
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 */
router.get('/tasks/mine', authMiddleware, deliveryController.riderTasks);

/**
 * @swagger
 * /api/delivery/me/availability:
 *   get:
 *     summary: Get current delivery partner availability
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Availability state
 *   patch:
 *     summary: Update delivery partner availability
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Availability updated
 */
router.get('/me/availability', authMiddleware, deliveryController.getAvailability);
router.patch('/me/availability', authMiddleware, deliveryController.updateAvailability);

/**
 * @swagger
 * /api/delivery/me/identity-verification:
 *   post:
 *     summary: Submit delivery partner identity verification
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Identity verification submitted
 */
router.post('/me/identity-verification', authMiddleware, deliveryController.submitIdentity);

/**
 * @swagger
 * /api/delivery/earnings/summary:
 *   get:
 *     summary: Get delivery partner earnings summary
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings summary
 */
router.get('/earnings/summary', authMiddleware, deliveryController.earningsSummary);

router.post('/tasks/accept', authMiddleware, deliveryController.acceptTask);
router.post('/tasks/:taskId/accept', authMiddleware, deliveryController.acceptTask);

/**
 * @swagger
 * /api/delivery/tasks/{taskId}/reject:
 *   post:
 *     summary: Reject an assigned delivery task
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Task rejected
 */
router.post('/tasks/:taskId/reject', authMiddleware, deliveryController.rejectTask);
router.get('/tasks/:taskId', authMiddleware, deliveryController.getTask);
router.post('/tasks/:taskId/arrived-pickup', authMiddleware, deliveryController.arrivedPickup);
router.post('/tasks/:taskId/confirm-pickup', authMiddleware, deliveryController.confirmPickup);
router.post('/tasks/:taskId/location', authMiddleware, deliveryController.updateLocation);
router.post('/tasks/:taskId/mark-delivered', authMiddleware, deliveryController.markDelivered);

/**
 * @swagger
 * /api/delivery/tasks/{taskId}/proof:
 *   post:
 *     summary: Submit proof of delivery
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Proof submitted
 */
router.post('/tasks/:taskId/proof', authMiddleware, deliveryController.submitDeliveryProof);

/**
 * @swagger
 * /api/delivery/tasks/{taskId}/failure:
 *   post:
 *     summary: Mark delivery attempt as failed
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Failure recorded
 */
router.post('/tasks/:taskId/failure', authMiddleware, deliveryController.markFailure);
router.post('/tasks/:taskId/sos', authMiddleware, deliveryController.sos);

module.exports = router;
