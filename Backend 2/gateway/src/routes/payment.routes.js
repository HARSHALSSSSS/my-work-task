const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const { buildAuthedProxyReqOptDecorator, buildProxyReqBodyDecorator } = require('../utils/proxy');

const router = Router();

router.use('/', authenticate, proxy(config.services.payment, {
  proxyReqPathResolver: (req) => `/api/payments${req.url}`,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.payment),
}));


/**
 * @swagger
 * tags:
 *   - name: Gateway Payment
 *     description: payment gateway routes
 *
 * /api/payment:
 *   get:
 *     summary: Base payment route
 *     tags: [Gateway Payment]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
