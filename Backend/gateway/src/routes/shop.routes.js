const { Router } = require('express');
const proxy = require('express-http-proxy');

const config = require('../config');
const { authenticate, optionalAuth } = require('../middlewares/auth');

const router = Router();

router.post(
    '/orders',
    authenticate,
    proxy(config.services.order, {
        proxyReqPathResolver: () => '/api/shop/orders',
    })
);

router.use(
    '/',
    optionalAuth,
    proxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/shop${req.url}`,
    })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway Shop
 *     description: shop gateway routes
 *
 * /api/shop:
 *   get:
 *     summary: Base shop route
 *     tags: [Gateway Shop]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
