const jwt = require('jsonwebtoken');
const { config } = require('../config/index');
const { errorResponse } = require('../utils/api-response');


const authMiddleware = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];
    if (userId && role) {
        req.user = { userId, role };
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json(errorResponse('Unauthorized'));
    }
    try {
        const payload = jwt.verify(authHeader.replace('Bearer ', ''), config.JWT_SECRET);
        req.user = { userId: payload.id || payload.userId, role: payload.role || 'user' };
        next();
    } catch {
        res.status(401).json(errorResponse('Unauthorized'));
    }
};

module.exports = { authMiddleware };
