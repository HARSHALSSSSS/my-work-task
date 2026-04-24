const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Delivery service — port 4009 (add when service is ready)
router.use('/', authenticate, proxy(config.services.delivery, {
  proxyReqPathResolver: (req) => `/api/delivery${req.url}`,
}));


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
