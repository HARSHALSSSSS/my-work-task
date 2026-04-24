const internalAuthMiddleware = (req, res, next) => {
    const token = req.headers['x-internal-token'];
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN || 'speedcopy-internal-dev-token';

    if (!expectedToken) {
        return res.status(500).json({ success: false, message: 'Internal token not configured' });
    }

    if (token !== expectedToken) {
        return res.status(401).json({ success: false, message: 'Invalid internal token' });
    }

    next();
};

module.exports = { internalAuthMiddleware };
