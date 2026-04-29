const authService = require('../services/auth.service');
const { verifyGoogleToken } = require('../services/google-auth.service');
const phoneAuthService = require('../services/phone-auth.service');
const { signToken, buildSessionPayload } = require('../../../../shared/utils/jwt');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response.js');

/**
 * POST /api/auth/google-verify
 * Mobile/web user-app & delivery-app Google Sign-In.
 * Admins, vendors, staff are NOT allowed via this endpoint.
 */
const googleLogin = async (req, res, next) => {
    try {
        const { idToken, role } = req.body;
        if (!idToken) return sendError(res, 'idToken is required', 400);

        const { user } = await verifyGoogleToken(idToken, role);

        const isNew = Date.now() - new Date(user.createdAt).getTime() < 5000;
        return isNew
            ? sendCreated(res, { user }, 'Account created successfully')
            : sendSuccess(res, { user }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

const sendPhoneOtp = async (req, res, next) => {
    try {
        const data = await phoneAuthService.sendOtp(req.body.phone);
        return sendSuccess(res, data, 'OTP sent successfully');
    } catch (err) {
        next(err);
    }
};

const verifyPhoneOtp = async (req, res, next) => {
    try {
        const { user } = await phoneAuthService.verifyOtp(req.body.phone, req.body.otp);
        const token = signToken(buildSessionPayload(user));
        
        const isNew = Date.now() - new Date(user.createdAt).getTime() < 5000;
        return isNew
            ? sendCreated(res, { user, token }, 'Account created successfully')
            : sendSuccess(res, { user, token }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/register
 * Register a new user with email/password.
 */
const register = async (req, res, next) => {
    try {
        const { user } = await authService.registerUser(req.body);
        return sendCreated(res, { user }, 'User registered successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/login
 * Login with email/password.
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { user } = await authService.loginUser(email, password);
        const token = signToken(buildSessionPayload(user));
        
        return sendSuccess(res, { user, token }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/verify
 * Client sends Firebase ID token once in the Authorization header.
 * We verify it, sync the local user profile, and return a short JWT for normal API usage.
 */
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendError(res, 'Firebase token is required in Authorization header', 401);
        }

        const firebaseToken = authHeader.split(' ')[1];
        const { role } = req.body;

        const { user } = await authService.verifyFirebaseToken(firebaseToken, role);
        const token = signToken(buildSessionPayload(user));

        const isNew = Date.now() - new Date(user.createdAt).getTime() < 5000;
        return isNew
            ? sendCreated(res, { token }, 'Account created successfully')
            : sendSuccess(res, { token }, 'Token issued successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me
 * Returns current user profile using the short JWT or forwarded gateway headers.
 */
const getMe = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'] || req.user?.id;
        if (!userId) return sendError(res, 'User ID not found in request', 400);
        const user = await authService.getMe(userId);
        return sendSuccess(res, { user });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/auth/users/:id/role
 * Admin only — update a user's role.
 */
const updateRole = async (req, res, next) => {
    try {
        const user = await authService.updateRole(req.params.id, req.body.role);
        return sendSuccess(res, { user }, 'Role updated');
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/auth/users/:id/status
 * Admin only — activate or deactivate a user.
 */
const setUserStatus = async (req, res, next) => {
    try {
        const user = await authService.setUserStatus(req.params.id, req.body.isActive);
        return sendSuccess(
            res,
            { user },
            `User ${req.body.isActive ? 'activated' : 'deactivated'}`
        );
    } catch (err) {
        next(err);
    }
};

module.exports = {
    verifyToken,
    register,
    login,
    getMe,
    updateRole,
    setUserStatus,
    googleLogin,
    sendPhoneOtp,
    verifyPhoneOtp,
};
