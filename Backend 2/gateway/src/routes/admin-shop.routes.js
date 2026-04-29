const { Router } = require('express');
const proxy = require('express-http-proxy');

const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const { buildAuthedProxyReqOptDecorator, buildProxyReqBodyDecorator } = require('../utils/proxy');

const router = Router();

router.use(
    '/shop',
    authenticate,
    proxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/shop${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
    })
);

router.use(
    '/gifting',
    authenticate,
    proxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/gifting${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
    })
);

router.use(
    '/banners',
    authenticate,
    proxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/admin/banners${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.product),
    })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway Admin-shop
 *     description: admin-shop gateway routes
 *
 * /api/admin-shop:
 *   get:
 *     summary: Base admin-shop route
 *     tags: [Gateway Admin-shop]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
