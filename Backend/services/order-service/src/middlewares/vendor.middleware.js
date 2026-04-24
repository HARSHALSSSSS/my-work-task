const vendorOnly = (req, res, next) => {
    const role = req.user?.role || req.headers['x-user-role'];
    if (!role || !['vendor', 'admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Vendor access required' });
    }
    next();
};

module.exports = { vendorOnly };
