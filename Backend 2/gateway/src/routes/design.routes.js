const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');
const { buildAuthedProxyReqOptDecorator, buildProxyReqBodyDecorator } = require('../utils/proxy');

const router = Router();

router.use('/', authenticate, proxy(config.services.design, {
  proxyReqPathResolver: (req) => `/api/designs${req.url}`,
  proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
  proxyReqOptDecorator: buildAuthedProxyReqOptDecorator(config.services.design),
}));


/**
 * @swagger
 * tags:
 *   - name: Gateway Design
 *     description: design gateway routes
 *
 * /api/design:
 *   get:
 *     summary: Base design route
 *     tags: [Gateway Design]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
