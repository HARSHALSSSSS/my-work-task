const { Router } = require('express');
const walletController = require('../controllers/wallet.controller');
const referralController = require('../controllers/referral.controller');
const payoutController = require('../controllers/payout.controller');

const router = Router();

const adminOnly = (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!['admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

const vendorOnly = (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!['vendor', 'admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Vendor access required' });
    }
    next();
};

const deliveryOnly = (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!['delivery_partner', 'admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Delivery access required' });
    }
    next();
};

/**
 * @swagger
 * tags:
 *   - name: Wallet
 *     description: Customer wallet and ledger
 *   - name: Referrals
 *     description: Referral system
 *   - name: Vendor Finance
 *     description: Vendor payouts and finance
 *   - name: Admin Finance
 *     description: Admin finance management
 */

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet with balance
 */
router.get('/wallet', walletController.getWallet);

/**
 * @swagger
 * /api/wallet/overview:
 *   get:
 *     summary: Get wallet overview with all details
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet overview with stats
 */
router.get('/wallet/overview', walletController.getWalletOverview);

/**
 * @swagger
 * /api/wallet/topup-config:
 *   get:
 *     summary: Get wallet topup configuration
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Topup configuration and payment gateways
 */
router.get('/wallet/topup-config', walletController.getTopupConfig);

/**
 * @swagger
 * /api/wallet/topup-preview:
 *   post:
 *     summary: Preview wallet topup with fees
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Topup preview with breakdown
 */
router.post('/wallet/topup-preview', walletController.previewTopup);

/**
 * @swagger
 * /api/wallet/add-funds:
 *   post:
 *     summary: Add funds to wallet via payment gateway
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, paymentMethod]
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, upi, netbanking]
 *     responses:
 *       201:
 *         description: Payment initiated
 */
router.post('/wallet/add-funds', walletController.addFunds);

/**
 * @swagger
 * /api/wallet/razorpay/initiate:
 *   post:
 *     summary: Initiate Razorpay payment for wallet topup
 *     tags: [Wallet]
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
router.post('/wallet/razorpay/initiate', walletController.initiateRazorpayPayment);

/**
 * @swagger
 * /api/wallet/razorpay/verify:
 *   post:
 *     summary: Verify Razorpay payment and credit wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
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
 *         description: Payment verified and wallet credited
 */
router.post('/wallet/razorpay/verify', walletController.verifyRazorpayPayment);

/**
 * @swagger
 * /api/wallet/ledger:
 *   get:
 *     summary: Get wallet transaction ledger
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [order_payment, refund, referral_reward, payout, wallet_topup, admin_credit]
 *     responses:
 *       200:
 *         description: Paginated ledger entries
 */
/**
 * @swagger
 * /wallet/ledger:
 *   get:
 *     summary: GET /wallet/ledger
 *     tags: [Finance]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.get('/wallet/ledger', walletController.getLedger);

/**
 * @swagger
 * /api/referrals:
 *   get:
 *     summary: Get my referral code and referral history
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code and history
 */
router.get('/referrals', referralController.getReferrals);

/**
 * @swagger
 * /api/referrals/summary:
 *   get:
 *     summary: Get referral summary and stats
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral summary with stats
 */
router.get('/referrals/summary', referralController.getReferralSummary);

/**
 * @swagger
 * /api/referrals/apply:
 *   post:
 *     summary: Apply a referral code
 *     tags: [Referrals]
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
 *               code:
 *                 type: string
 *                 example: SCABC1XY2Z
 *     responses:
 *       201:
 *         description: Referral applied
 *       400:
 *         description: Invalid or already used code
 */
/**
 * @swagger
 * /referrals/apply:
 *   post:
 *     summary: POST /referrals/apply
 *     tags: [Finance]
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/referrals/apply', referralController.applyReferral);

/**
 * @swagger
 * /api/vendor/finance/summary:
 *   get:
 *     summary: Get vendor finance summary (pending payout, total paid)
 *     tags: [Vendor Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Finance summary
 */
router.get('/vendor/finance/summary', vendorOnly, payoutController.getVendorSummary);

/**
 * @swagger
 * /api/vendor/finance/payout-history:
 *   get:
 *     summary: Get vendor payout history
 *     tags: [Vendor Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated payout history
 */
router.get('/vendor/finance/payout-history', vendorOnly, payoutController.getPayoutHistory);

/**
 * @swagger
 * /api/delivery/earnings/summary:
 *   get:
 *     summary: Get delivery partner earnings summary from finance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Delivery earnings summary
 */
router.get('/delivery/earnings/summary', deliveryOnly, walletController.getDeliveryEarningsSummary);

/**
 * @swagger
 * /api/admin/finance/summary:
 *   get:
 *     summary: Get platform-wide finance summary (admin only)
 *     tags: [Admin Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform finance summary
 */
router.get('/admin/finance/summary', adminOnly, payoutController.getAdminSummary);

/**
 * @swagger
 * /api/admin/refunds/{orderId}:
 *   post:
 *     summary: Process a refund to customer wallet (admin only)
 *     tags: [Admin Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, customerId]
 *             properties:
 *               amount: { type: number }
 *               customerId: { type: string }
 *               reason: { type: string }
 *     responses:
 *       201:
 *         description: Refund processed
 */
/**
 * @swagger
 * /admin/refunds/{orderId}:
 *   post:
 *     summary: POST /admin/refunds/{orderId}
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Successful operation
 */
router.post('/admin/refunds/:orderId', adminOnly, payoutController.createRefund);

module.exports = router;
