const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use('/', authenticate, proxy(config.services.order, {
  proxyReqPathResolver: (req) => `/api/orders${req.url}`,
}));


/**
 * @swagger
 * tags:
 *   - name: Gateway Order
 *     description: order gateway routes
 *
 * /api/order:
 *   get:
 *     summary: Base order route
 *     tags: [Gateway Order]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
