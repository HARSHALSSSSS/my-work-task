/**
 * Ensure a Firebase Auth admin user exists and has the expected password.
 *
 * Usage:
 *   npm run firebase:ensure-admin
 *
 * Optional env overrides:
 *   FIREBASE_ADMIN_EMAIL=admin@speedcopy.com
 *   FIREBASE_ADMIN_PASSWORD=Admin@123456
 *   FIREBASE_ADMIN_DISPLAY_NAME=SpeedCopy Admin
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const admin = require('firebase-admin');
const { initFirebase } = require('../src/config/firebase');

const ADMIN_EMAIL = process.env.FIREBASE_ADMIN_EMAIL || 'admin@speedcopy.com';
const ADMIN_PASSWORD = process.env.FIREBASE_ADMIN_PASSWORD || 'Admin@123456';
const ADMIN_DISPLAY_NAME = process.env.FIREBASE_ADMIN_DISPLAY_NAME || 'SpeedCopy Admin';

const ensureAdminUser = async () => {
    try {
        const app = initFirebase();
        if (!app || !admin.apps.length) {
            throw new Error(
                'Firebase Admin SDK is not initialized. Check FIREBASE_SERVICE_ACCOUNT_PATH in auth-service .env.'
            );
        }

        const auth = admin.auth();
        let user;

        try {
            user = await auth.getUserByEmail(ADMIN_EMAIL);
            await auth.updateUser(user.uid, {
                password: ADMIN_PASSWORD,
                displayName: ADMIN_DISPLAY_NAME,
                emailVerified: true,
                disabled: false,
            });
            console.log(`[Firebase] Updated existing user: ${ADMIN_EMAIL} (uid: ${user.uid})`);
        } catch (error) {
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }

            user = await auth.createUser({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                displayName: ADMIN_DISPLAY_NAME,
                emailVerified: true,
                disabled: false,
            });
            console.log(`[Firebase] Created new user: ${ADMIN_EMAIL} (uid: ${user.uid})`);
        }

        console.log('[Firebase] Admin user is ready for Email/Password login.');
    } catch (error) {
        console.error('[Firebase] Failed to ensure admin user:', error.message || error);
        process.exitCode = 1;
    }
};

ensureAdminUser();
