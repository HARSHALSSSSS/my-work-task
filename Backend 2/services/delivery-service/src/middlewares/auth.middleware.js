const { verifyToken, normalizeVerifiedToken } = require('../../../../shared/utils/jwt');
const { errorResponse } = require('../utils/api-response');


const authMiddleware = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];
    if (userId && role) {
        req.user = { userId, id: userId, uid: req.headers['x-firebase-uid'] || userId, role };
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json(errorResponse('Unauthorized'));
    }
    try {
        const payload = normalizeVerifiedToken(verifyToken(authHeader.replace('Bearer ', '')));
        const resolvedUserId = payload.id || payload.userId || payload.uid;
        req.user = { userId: resolvedUserId, id: resolvedUserId, uid: payload.uid, role: payload.role || 'user' };
        next();
    } catch {
        res.status(401).json(errorResponse('Unauthorized'));
    }
};

module.exports = { authMiddleware };
