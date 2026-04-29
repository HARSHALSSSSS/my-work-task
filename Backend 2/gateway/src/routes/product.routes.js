const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { optionalAuth } = require('../middlewares/auth');
const { buildProxyReqOptDecorator, buildProxyReqBodyDecorator } = require('../utils/proxy');

const router = Router();

// Products are publicly readable; writes require auth (handled in product-service)
router.use('/', optionalAuth, proxy(config.services.product, {
  proxyReqPathResolver: (req) => `/api/products${req.url}`,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
}));


/**
 * @swagger
 * tags:
 *   - name: Gateway Product
 *     description: product gateway routes
 *
 * /api/product:
 *   get:
 *     summary: Base product route
 *     tags: [Gateway Product]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
