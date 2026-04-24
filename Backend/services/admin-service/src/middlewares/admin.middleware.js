const adminOnly = (req, res, next) => {
    const role = req.user?.role || req.headers['x-user-role'];
    if (!role || !['admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

module.exports = { adminOnly };
