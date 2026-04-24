const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendSuccess, sendError } = require('../../../../shared/utils/response');
const VendorStaff = require('../models/vendor-staff.model');
const VendorOrg = require('../models/vendor-org.model');

const getAuthConn = async () => {
    const uri = process.env.AUTH_DB_URI || 'mongodb://127.0.0.1:27017/speedcopy_auth';
    const existing = mongoose.connections.find(
        (c) => c.name === 'speedcopy_auth' && c.readyState === 1
    );
    if (existing) return existing;
    return mongoose.createConnection(uri, { family: 4, serverSelectionTimeoutMS: 5000 }).asPromise();
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return sendError(res, 'Email and password required', 400);

        const conn = await getAuthConn();
        const normalizedEmail = email.toLowerCase();
        const user = await conn.db.collection('users').findOne({ email: normalizedEmail });

        if (!user || user.role !== 'vendor') {
            return sendError(res, 'Invalid vendor credentials', 401);
        }

        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) return sendError(res, 'Invalid vendor credentials', 401);

        if (!user.isActive) return sendError(res, 'Vendor account deactivated', 403);

        const linkedStaff = await VendorStaff.findOne({
            authUserId: user._id.toString(),
            deletedAt: null,
            isActive: true,
        }).lean();

        const tokenUserId = linkedStaff?.vendorId || user._id.toString();
        const portalRole = linkedStaff
            ? linkedStaff.role === 'manager'
                ? 'Manager'
                : 'Staff'
            : 'Owner';
        const permissions = linkedStaff
            ? [
                  'view_all',
                  'view_assigned',
                  ...(linkedStaff.role === 'manager' ? ['staff_management', 'store_management'] : []),
              ]
            : [
                  'view_all',
                  'edit_all',
                  'financial_access',
                  'user_management',
                  'org_settings',
                  'store_management',
                  'staff_management',
                  'edit_operations',
                  'edit_production',
                  'job_management',
              ];
        const storeScope = linkedStaff?.assignedStoreIds?.length
            ? linkedStaff.assignedStoreIds
            : linkedStaff?.storeId
              ? [linkedStaff.storeId]
              : [];

        const token = jwt.sign(
            { id: tokenUserId, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'speedcopy-dev-secret',
            { expiresIn: '7d' }
        );

        delete user.password;

        return sendSuccess(res, {
            user: {
                ...user,
                portalRole,
                permissions,
                storeScope,
                staffId: linkedStaff?._id?.toString() || null,
            },
            token,
            mfaRequired: false,
        });
    } catch (err) {
        next(err);
    }
};

const verifyMfa = async (req, res, next) => {
    try {
        const { otp } = req.body;
        if (!otp) return sendError(res, 'OTP required', 400);
        return sendSuccess(res, { verified: true }, 'MFA Verified');
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
        next(err);
    }
};

const getSession = async (req, res, next) => {
    try {
        const vendorId = req.headers['x-user-id'];
        const sessionEmail = req.headers['x-user-email'];
        const conn = await getAuthConn();
        const vendorOrg = await VendorOrg.findOne({ userId: vendorId, deletedAt: null }).lean();
        const linkedStaff = sessionEmail
            ? await VendorStaff.findOne({
                  vendorId,
                  email: String(sessionEmail).toLowerCase(),
                  deletedAt: null,
              }).lean()
            : null;

        const userQuery = linkedStaff?.authUserId
            ? { _id: new mongoose.Types.ObjectId(linkedStaff.authUserId) }
            : vendorOrg?.userId
              ? { _id: new mongoose.Types.ObjectId(vendorOrg.userId) }
              : { _id: new mongoose.Types.ObjectId(vendorId) };
        const user = await conn.db.collection('users').findOne(userQuery);

        if (!user) return sendError(res, 'Session invalid', 401);
        delete user.password;

        return sendSuccess(res, {
            ...user,
            vendorOrgId: vendorId,
            portalRole: linkedStaff
                ? linkedStaff.role === 'manager'
                    ? 'Manager'
                    : 'Staff'
                : 'Owner',
            storeScope: linkedStaff?.assignedStoreIds?.length
                ? linkedStaff.assignedStoreIds
                : linkedStaff?.storeId
                  ? [linkedStaff.storeId]
                  : [],
            permissions: linkedStaff
                ? [
                      'view_all',
                      'view_assigned',
                      ...(linkedStaff.role === 'manager'
                          ? ['staff_management', 'store_management']
                          : []),
                  ]
                : [
                      'view_all',
                      'edit_all',
                      'financial_access',
                      'user_management',
                      'org_settings',
                      'store_management',
                      'staff_management',
                      'edit_operations',
                      'edit_production',
                      'job_management',
                  ],
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    login,
    verifyMfa,
    logout,
    getSession,
};
