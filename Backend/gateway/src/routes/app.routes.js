const { Router } = require('express');

const { authenticate, optionalAuth } = require('../middlewares/auth');
const appService = require('../services/app.service');

const router = Router();

const asyncHandler = (handler) => async (req, res, next) => {
    try {
        const data = await handler(req, res);
        if (!res.headersSent) {
            return res.json({ success: true, data });
        }
    } catch (error) {
        next(error);
    }
};

router.get('/home', optionalAuth, asyncHandler((req) => appService.getHome(req)));
router.get('/sidebar', authenticate, asyncHandler((req) => appService.getSidebar(req)));
router.get('/account/profile', authenticate, asyncHandler((req) => appService.getAccountProfile(req)));
router.get('/account/addresses', authenticate, asyncHandler((req) => appService.getAccountAddresses(req)));
router.get('/wallet', authenticate, asyncHandler((req) => appService.getWalletPage(req)));
router.post('/wallet/add-funds', authenticate, asyncHandler((req) => appService.addWalletFunds(req)));
router.get('/referrals', authenticate, asyncHandler((req) => appService.getReferralPage(req)));
router.get('/orders', authenticate, asyncHandler((req) => appService.getOrdersPage(req)));
router.get('/notifications', authenticate, asyncHandler((req) => appService.getNotificationsPage(req)));
router.get('/support', authenticate, asyncHandler((req) => appService.getSupportPage(req)));


/**
 * @swagger
 * tags:
 *   - name: Gateway App
 *     description: app gateway routes
 *
 * /api/app:
 *   get:
 *     summary: Base app route
 *     tags: [Gateway App]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
