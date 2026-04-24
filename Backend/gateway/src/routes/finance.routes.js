const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');

const router = Router();

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance
 *
 * /api/wallet/ledger:
 *   get:
 *     summary: Get wallet ledger
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ledger entries
 *
 * /api/referrals:
 *   get:
 *     summary: Get referral code and history
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral info
 *
 * /api/referrals/apply:
 *   post:
 *     summary: Apply a referral code
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *     responses:
 *       201:
 *         description: Referral applied
 *
 * /api/admin/finance/summary:
 *   get:
 *     summary: Get platform finance summary (admin)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Finance summary
 *
 * /api/admin/refunds/{orderId}:
 *   post:
 *     summary: Process refund to wallet (admin)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Refund processed
 */

const financeProxy = proxy(config.services.finance, {
  proxyReqPathResolver: (req) => `/api${req.url}`,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    // Ensure custom headers set by auth middleware are passed through
    if (srcReq.headers['x-user-id']) {
      proxyReqOpts.headers['x-user-id'] = srcReq.headers['x-user-id'];
    }
    if (srcReq.headers['x-user-role']) {
      proxyReqOpts.headers['x-user-role'] = srcReq.headers['x-user-role'];
    }
    if (srcReq.headers['x-user-email']) {
      proxyReqOpts.headers['x-user-email'] = srcReq.headers['x-user-email'];
    }
    return proxyReqOpts;
  },
});

// All finance APIs require authentication
router.use('/', authenticate, financeProxy);

module.exports = router;
