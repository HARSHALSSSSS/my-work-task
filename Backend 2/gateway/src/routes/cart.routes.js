const { Router } = require('express');
const proxy = require('express-http-proxy');

const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const { buildAuthedProxyReqOptDecorator, buildProxyReqBodyDecorator } = require('../utils/proxy');

const router = Router();

router.use(
    '/',
    authenticate,
    proxy(config.services.order, {
        proxyReqPathResolver: (req) => `/api/cart${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.order),
    })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway Cart
 *     description: cart gateway routes
 *
 * /api/cart:
 *   get:
 *     summary: Base cart route
 *     tags: [Gateway Cart]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
