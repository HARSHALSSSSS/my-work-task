/**
 * google-auth.service.js
 * Verifies a Google ID Token using google-auth-library.
 * Returns a standardised user payload compatible with auth.service.js.
 */
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const config = require('../config');

const client = new OAuth2Client(config.googleClientId);

/**
 * Verify a Google ID token (from the mobile/web frontend Google Sign-In SDK).
 * Only allowed for `user` and `delivery_partner` roles.
 * Admins / vendors / staff MUST use email+password.
 *
 * @param {string} idToken  — Google credential token from frontend
 * @param {string} role     — 'user' | 'delivery_partner' (defaults to 'user')
 */
const verifyGoogleToken = async (idToken, role = 'user') => {
    if (!config.googleClientId) {
        const err = new Error('Google authentication is not configured on this server');
        err.statusCode = 503;
        throw err;
    }

    // Only allow non-privileged roles via Google Sign-In
    const allowedRoles = ['user', 'delivery_partner'];
    const safeRole = allowedRoles.includes(role) ? role : 'user';

    let payload;
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: config.googleClientId,
        });
        payload = ticket.getPayload();
    } catch (err) {
        const error = new Error('Invalid or expired Google token');
        error.statusCode = 401;
        throw error;
    }

    const { sub: googleId, email, name, picture, email_verified } = payload;

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
        // Register new user
        user = await User.create({
            googleId,
            email,
            name: name || email.split('@')[0],
            photoURL: picture || '',
            role: safeRole,
            isEmailVerified: !!email_verified,
            isActive: true,
        });
    } else {
        // Update Google-specific fields and record login
        user.googleId = user.googleId || googleId;
        user.photoURL = user.photoURL || picture || '';
        user.isEmailVerified = email_verified || user.isEmailVerified;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });
    }

    if (!user.isActive) {
        const err = new Error('Account has been deactivated. Please contact support.');
        err.statusCode = 403;
        throw err;
    }

    return { user };
};

module.exports = { verifyGoogleToken };
