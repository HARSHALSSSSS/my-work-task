const adminOnly = (req, res, next) => {
    // req.user is set by authenticate middleware (direct call)
    // x-user-role is injected by gateway (proxied call)
    const role = req.user?.role || req.headers['x-user-role'];
    if (!role || !['admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

const staffOrAdmin = (req, res, next) => {
    const role = req.user?.role || req.headers['x-user-role'];
    if (!role || !['admin', 'super_admin', 'staff'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Staff or admin access required' });
    }
    next();
};

module.exports = { adminOnly, staffOrAdmin };
