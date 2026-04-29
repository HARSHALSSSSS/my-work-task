const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const { buildAuthedProxyReqOptDecorator, buildProxyReqOptDecorator, buildProxyReqBodyDecorator } = require('../utils/proxy');

const router = Router();
const uploadProxy = proxy(config.services.delivery, {
  proxyReqPathResolver: (req) => req.originalUrl,
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.delivery),
  parseReqBody: false,
});
const deliveryProxy = proxy(config.services.delivery, {
  proxyReqPathResolver: (req) => req.originalUrl,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.delivery),
});

router.use('/auth', deliveryProxy);
router.use('/track', deliveryProxy);
router.use('/support/incident/uploads', authenticate, uploadProxy);

router.use('/', authenticate, deliveryProxy);


/**
 * @swagger
 * tags:
 *   - name: Gateway Delivery
 *     description: delivery gateway routes
 *
 * /api/delivery:
 *   get:
 *     summary: Base delivery route
 *     tags: [Gateway Delivery]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
