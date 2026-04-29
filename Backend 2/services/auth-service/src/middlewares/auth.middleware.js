const { verifyToken, normalizeVerifiedToken } = require('../../../../shared/utils/jwt');

const parsePermissions = (value) =>
    String(value || '')
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);

const authenticate = async (req, res, next) => {
    if (req.headers['x-user-id'] && req.headers['x-user-role']) {
        req.user = {
            id: String(req.headers['x-user-id']),
            userId: String(req.headers['x-user-id']),
            uid: req.headers['x-firebase-uid'] || String(req.headers['x-user-id']),
            role: req.headers['x-user-role'],
            email: req.headers['x-user-email'] || '',
            firebaseUid: req.headers['x-firebase-uid'] || undefined,
            permissions: parsePermissions(req.headers['x-user-permissions']),
        };
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    try {
        const token = authHeader.split(' ')[1];
        req.user = normalizeVerifiedToken(verifyToken(token));
        next();
    } catch (err) {
        return res.status(err.statusCode || 401).json({
            success: false,
            message: err.message || 'Invalid or expired token',
        });
    }
};

module.exports = { authenticate };
