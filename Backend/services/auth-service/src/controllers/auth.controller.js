const jwt = require('jsonwebtoken');
const config = require('../config');
const authService = require('../services/auth.service');
const { verifyGoogleToken } = require('../services/google-auth.service');
const phoneAuthService = require('../services/phone-auth.service');
const { sendSuccess, sendCreated, sendError } = require('../../../../shared/utils/response');

const issueSessionToken = (user) =>
    jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            firebaseUid: user.firebaseUid,
        },
        config.jwtSecret,
        { expiresIn: '7d' }
    );

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
        
        // Generate JWT token
        const { signToken } = require('../../../../shared/utils/jwt');
        const token = signToken({ id: user._id, role: user.role, email: user.email });
        
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
        
        // Generate JWT token
        const { signToken } = require('../../../../shared/utils/jwt');
        const token = signToken({ id: user._id, role: user.role, email: user.email });
        
        return sendSuccess(res, { user, token }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/verify
 * Client sends Firebase ID token → we verify and return the user profile.
 * Works for ALL roles: user, vendor, admin, delivery_partner
 */
const verifyToken = async (req, res, next) => {
    try {
        const { idToken, role } = req.body;
        if (!idToken) return sendError(res, 'idToken is required', 400);

        const { user } = await authService.verifyFirebaseToken(idToken, role);
        const { signToken } = require('../../../../shared/utils/jwt');
        const token = signToken({
            id: user._id,
            role: user.role,
            email: user.email,
            firebaseUid: user.firebaseUid,
        });

        const isNew = Date.now() - new Date(user.createdAt).getTime() < 5000;
        return isNew
            ? sendCreated(res, { user, token }, 'Account created successfully')
            : sendSuccess(res, { user, token }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me
 * Returns current user profile using a Firebase ID token.
 * Works whether called directly (Firebase token in header) or via gateway (x-user-id injected).
 */
const getMe = async (req, res, next) => {
    try {
        // Gateway injects x-user-id after verifying Firebase auth
        // Direct call: req.user is set by authenticate middleware
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
