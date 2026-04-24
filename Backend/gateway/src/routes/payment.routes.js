const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use('/', authenticate, proxy(config.services.payment, {
  proxyReqPathResolver: (req) => `/api/payments${req.url}`,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    // Ensure custom headers set by auth middleware are passed through
    if (srcReq.headers['x-user-id']) {
      proxyReqOpts.headers['x-user-id'] = srcReq.headers['x-user-id'];
    }
    if (srcReq.headers['x-user-role']) {
      proxyReqOpts.headers['x-user-role'] = srcReq.headers['x-user-role'];
    }
    if (srcReq.headers['x-user-email']) {
      proxyReqOpts.headers['x-user-email'] = srcReq.headers['x-user-email'];
    }
    return proxyReqOpts;
  },
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
