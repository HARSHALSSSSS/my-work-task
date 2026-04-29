const { verifyToken, normalizeVerifiedToken } = require('../../../../shared/utils/jwt');

const parsePermissions = (value) =>
    String(value || '')
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);

const authenticate = async (req, res, next) => {
    const forwardedUserId = req.headers['x-user-id'];
    const forwardedRole = req.headers['x-user-role'];

    if (forwardedUserId && forwardedRole) {
        req.user = {
            id: String(forwardedUserId),
            userId: String(forwardedUserId),
            uid: req.headers['x-firebase-uid'] || String(forwardedUserId),
            firebaseUid: req.headers['x-firebase-uid'] || null,
            role: forwardedRole,
            email: req.headers['x-user-email'] || '',
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
        const user = normalizeVerifiedToken(verifyToken(token));

        req.user = {
            id: user.id,
            userId: user.userId,
            uid: user.uid,
            firebaseUid: user.firebaseUid || null,
            role: user.role,
            email: user.email,
            permissions: Array.isArray(user.permissions) ? user.permissions : [],
        };

        req.headers['x-user-id'] = req.headers['x-user-id'] || req.user.id;
        req.headers['x-user-role'] = req.headers['x-user-role'] || req.user.role;
        if (req.user.email) req.headers['x-user-email'] = req.headers['x-user-email'] || req.user.email;
        if (req.user.permissions.length && !req.headers['x-user-permissions']) {
            req.headers['x-user-permissions'] = req.user.permissions.join(',');
        }

        next();
    } catch (error) {
        return res.status(error.statusCode || 401).json({
            success: false,
            message: error.message || 'Invalid or expired token',
        });
    }
};

module.exports = { authenticate };
