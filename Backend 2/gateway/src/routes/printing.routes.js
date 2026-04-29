const { Router } = require('express');
const proxy = require('express-http-proxy');

const config = require('../config');
const { optionalAuth } = require('../middlewares/auth');
const { buildProxyReqBodyDecorator, buildProxyReqOptDecorator } = require('../utils/proxy');

const router = Router();

router.use(
    '/',
    optionalAuth,
    proxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/printing${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
    })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway Printing
 *     description: printing gateway routes
 *
 * /api/printing:
 *   get:
 *     summary: Base printing route
 *     tags: [Gateway Printing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
