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
        proxyReqPathResolver: (req) => `/api/business-printing${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
    })
);


/**
 * @swagger
 * tags:
 *   - name: Gateway Business-printing
 *     description: business-printing gateway routes
 *
 * /api/business-printing:
 *   get:
 *     summary: Base business-printing route
 *     tags: [Gateway Business-printing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
