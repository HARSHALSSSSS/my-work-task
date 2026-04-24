const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authLimiter } = require('../middlewares/rate-limit');
const { authenticate } = require('../middlewares/auth');

const router = Router();

const authProxy = (extraMiddleware) => {
  const middlewares = extraMiddleware || [];
  return [
    ...middlewares,
    proxy(config.services.auth, {
      // Use originalUrl so the full path is preserved (e.g. /api/auth/verify)
      proxyReqPathResolver: (req) => req.originalUrl,
    }),
  ];
};

// POST /api/auth/verify — public
router.post('/verify', authLimiter, ...authProxy());

// GET /api/auth/me — requires JWT
router.get('/me', ...authProxy([authenticate]));

// PATCH /api/auth/users/:id/role — requires JWT (admin check done in auth-service)
router.patch('/users/:id/role', ...authProxy([authenticate]));

// PATCH /api/auth/users/:id/status — requires JWT
router.patch('/users/:id/status', ...authProxy([authenticate]));

// Fallback — catch any other /api/auth/* routes
router.use('/', ...authProxy());


/**
 * @swagger
 * tags:
 *   - name: Gateway Auth
 *     description: auth gateway routes
 *
 * /api/auth:
 *   get:
 *     summary: Base auth route
 *     tags: [Gateway Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 */

module.exports = router;
