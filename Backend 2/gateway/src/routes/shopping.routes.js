const { Router } = require('express');
const proxy = require('express-http-proxy');

const config = require('../config');
const { optionalAuth } = require('../middlewares/auth');
const { buildProxyReqBodyDecorator, buildProxyReqOptDecorator } = require('../utils/proxy');

const router = Router();

router.use(
    '/',
    optionalAuth,
    proxy(config.services.product, {
        proxyReqPathResolver: (req) => `/api/products/shopping${req.url}`,
        proxyReqBodyDecorator: buildProxyReqBodyDecorator(),
        proxyReqOptDecorator: buildProxyReqOptDecorator(config.services.product),
    })
);

module.exports = router;
