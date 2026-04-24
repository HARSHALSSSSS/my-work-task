const { Router } = require('express');
const proxy = require('express-http-proxy');
const config = require('../config');
const { authenticate } = require('../middlewares/auth');

const router = Router();
const adminService = config.services.admin;

const staffProxy = proxy(adminService, {
    proxyReqPathResolver: (req) => `/api/staff${req.url}`,
    proxyErrorHandler: (err, res, next) => {
        if (
            err?.code === 'ECONNREFUSED' ||
            err?.code === 'ENOTFOUND' ||
            err?.code === 'ECONNRESET' ||
            err?.code === 'ETIMEDOUT'
        ) {
            return res.status(502).json({
                success: false,
                message: 'Staff service is unavailable. Please make sure admin-service is running on port 4008.',
            });
        }

        return next(err);
    },
});

// Staff login/MFA start before a gateway session exists.
router.post('/auth/login', staffProxy);
router.post('/auth/mfa/verify', staffProxy);

// All remaining staff APIs require a valid platform JWT at the gateway.
router.use('/', authenticate, staffProxy);

module.exports = router;
