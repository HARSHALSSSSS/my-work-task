const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use('/', authenticate, proxy(config.services.user, {
  proxyReqPathResolver: (req) => `/api/users${req.url}`,
}));


/**
 * @swagger
 * tags:
 *   - name: Gateway User
 *     description: user gateway routes
 *
 * /api/user:
 *   get:
 *     summary: Base user route
 *     tags: [Gateway User]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
