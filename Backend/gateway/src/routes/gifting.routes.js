const { Router } = require('express');
const proxy = require('express-http-proxy');

const config = require('../config');
const { authenticate, optionalAuth } = require('../middlewares/auth');

const router = Router();

router.use(
    '/cart',
    authenticate,
    proxy(config.services.order, {
        proxyReqPathResolver: (req) => `/api/gifting/cart${req.url}`,
    })
);

router.post(
    '/orders',
    authenticate,
    proxy(config.services.order, {
        proxyReqPathResolver: () => '/api/gifting/orders',
    })
);

router.use(
    '/',
    optionalAuth,
    proxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/gifting${req.url}`,
    })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway Gifting
 *     description: gifting gateway routes
 *
 * /api/gifting:
 *   get:
 *     summary: Base gifting route
 *     tags: [Gateway Gifting]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
