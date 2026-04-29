const { verifyToken, normalizeVerifiedToken } = require('../utils/jwt');
const { sendUnauthorized, sendForbidden } = require('../utils/response');

/**
 * Verifies internal JWT (issued by auth-service after Firebase verification).
 * Attaches decoded user to req.user.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendUnauthorized(res, 'No token provided');
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = normalizeVerifiedToken(verifyToken(token));
        next();
    } catch {
        return sendUnauthorized(res, 'Invalid or expired token');
    }
};

/**
 * Role-based access control.
 * Usage: authorize('admin') or authorize('admin', 'vendor')
 */
const authorize =
    (...roles) =>
    (req, res, next) => {
        const role = req.user?.role || req.headers['x-user-role'];
        if (!role || !roles.includes(role)) {
            return sendForbidden(res, 'Insufficient permissions');
        }
        next();
    };

module.exports = { authenticate, authorize };
