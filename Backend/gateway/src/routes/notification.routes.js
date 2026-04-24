const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');

const router = Router();

const notifProxy = proxy(config.services.notification, {
  proxyReqPathResolver: (req) => `/api/notifications${req.url}`,
});

router.use('/', authenticate, notifProxy);


/**
 * @swagger
 * tags:
 *   - name: Gateway Notification
 *     description: notification gateway routes
 *
 * /api/notification:
 *   get:
 *     summary: Base notification route
 *     tags: [Gateway Notification]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
