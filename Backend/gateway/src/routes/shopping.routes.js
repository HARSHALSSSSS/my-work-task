const { Router } = require('express');
const proxy = require('express-http-proxy');

const config = require('../config');
const { optionalAuth } = require('../middlewares/auth');

const router = Router();

router.use(
    '/',
    optionalAuth,
    proxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/products/shopping${req.url}`,
    })
);

module.exports = router;
