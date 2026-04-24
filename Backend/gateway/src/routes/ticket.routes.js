const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Tickets live in notification-service under /api/notifications/tickets
router.use('/', authenticate, proxy(config.services.notification, {
  proxyReqPathResolver: (req) => `/api/notifications/tickets${req.url}`,
}));


/**
 * @swagger
 * tags:
 *   - name: Gateway Ticket
 *     description: ticket gateway routes
 *
 * /api/ticket:
 *   get:
 *     summary: Base ticket route
 *     tags: [Gateway Ticket]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
