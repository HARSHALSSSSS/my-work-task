const { Router } = require('express');
const controller = require('../controllers/payment.controller');
const validate = require('../../../../shared/middlewares/validate.middleware');
const { createPaymentSchema, verifyPaymentSchema } = require('../validators/payment.validator');

const router = Router();

/**
 * @swagger
 * /api/payments/create:
 *   post:
 *     summary: Create a Razorpay payment order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, amount]
 *             properties:
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment order created
 */
/**
 * @swagger
 * /create:
 *   post:
 *     summary: POST /create
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Successful operation
 */
// NOTE: /create does NOT require auth here because:
// 1. External calls go through gateway which applies auth middleware
// 2. Internal service calls (if any) don't need auth
// 3. The x-user-id header is set by gateway auth middleware
router.post('/create', validate(createPaymentSchema), controller.createPayment);

/**
 * @swagger
 * /api/payments/verify:
 *   post:
 *     summary: Verify Razorpay payment signature (internal service call)
 *     tags: [Payments]
 *     description: Called by finance-service for internal payment verification. Does not require auth.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpayOrderId, razorpayPaymentId, razorpaySignature]
 *             properties:
 *               razorpayOrderId:
 *                 type: string
 *               razorpayPaymentId:
 *                 type: string
 *               razorpaySignature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified
 */
/**
 * @swagger
 * /verify:
 *   post:
 *     summary: POST /verify
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Successful operation
 */
// NOTE: /verify does NOT require auth because it's called internally by finance-service
// The gateway-level /api/payments/verify endpoint DOES require auth via gateway middleware
router.post('/verify', validate(verifyPaymentSchema), controller.verifyPayment);

module.exports = router;
