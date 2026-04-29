const vendorOnly = (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!role || !['vendor', 'admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Vendor access required' });
    }
    next();
};

const adminOnly = (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!role || !['admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

module.exports = { vendorOnly, adminOnly };
