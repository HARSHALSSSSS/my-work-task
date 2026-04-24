const getUserFromAuthService = async (token) => {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
    const response = await fetch(`${authServiceUrl}/api/auth/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(payload?.message || 'Invalid or expired Firebase token');
        error.statusCode = response.status || 401;
        throw error;
    }

    const user = payload?.data?.user || payload?.user || payload?.data || null;
    if (!user) {
        const error = new Error('Authenticated user payload missing');
        error.statusCode = 401;
        throw error;
    }

    return user;
};

const authenticate = async (req, res, next) => {
    const forwardedUserId = req.headers['x-user-id'];
    const forwardedRole = req.headers['x-user-role'];

    if (forwardedUserId && forwardedRole) {
        req.user = {
            id: String(forwardedUserId),
            firebaseUid: req.headers['x-firebase-uid'] || null,
            role: forwardedRole,
            email: req.headers['x-user-email'] || '',
        };
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No Firebase token provided' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const user = await getUserFromAuthService(token);

        req.user = {
            id: user._id.toString(),
            firebaseUid: user.firebaseUid,
            role: user.role,
            email: user.email,
        };

        req.headers['x-user-id'] = req.headers['x-user-id'] || req.user.id;
        req.headers['x-user-role'] = req.headers['x-user-role'] || req.user.role;

        next();
    } catch (error) {
        return res.status(error.statusCode || 401).json({
            success: false,
            message: error.message || 'Invalid or expired Firebase token',
        });
    }
};

module.exports = { authenticate };
