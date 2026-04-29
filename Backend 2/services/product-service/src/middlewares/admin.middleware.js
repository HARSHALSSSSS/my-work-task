const adminOnly = (req, res, next) => {
    const role = req.user?.role || req.headers['x-user-role'];
    const permissionsHeader = req.headers['x-user-permissions'];
    const headerPermissions = String(permissionsHeader || '')
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean);
    const userPermissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const permissions = new Set([...headerPermissions, ...userPermissions]);
    const isCatalogStaff = role === 'staff' && permissions.has('catalog');

    if (!role || (!['admin', 'super_admin'].includes(role) && !isCatalogStaff)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    next();
};

module.exports = { adminOnly };
