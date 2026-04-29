const { config } = require('../config/index');
const { errorResponse } = require('../utils/api-response');

const internalAuthMiddleware = (req, res, next) => {
    const token = req.headers['x-internal-token'];
    if (!config.INTERNAL_SERVICE_TOKEN) {
        return res.status(500).json(errorResponse('Internal token not configured'));
    }
    if (token !== config.INTERNAL_SERVICE_TOKEN) {
        return res.status(401).json(errorResponse('Invalid internal token'));
    }
    next();
};

module.exports = { internalAuthMiddleware };
