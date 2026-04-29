/**
 * Ensure Firebase Auth staff users exist for local SpeedCopy portals.
 *
 * Usage:
 *   npm run firebase:ensure-staff
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const admin = require('firebase-admin');
const { initFirebase } = require('../src/config/firebase');

const STAFF_USERS = [
    {
        email: 'ops@speedcopy.com',
        password: 'Ops@123456',
        displayName: 'Ops Staff',
        role: 'staff',
        team: 'ops',
    },
    {
        email: 'support@speedcopy.com',
        password: 'Support@123456',
        displayName: 'Support Staff',
        role: 'staff',
        team: 'support',
    },
    {
        email: 'finance@speedcopy.com',
        password: 'Finance@123456',
        displayName: 'Finance Staff',
        role: 'staff',
        team: 'finance',
    },
    {
        email: 'marketing@speedcopy.com',
        password: 'Marketing@123456',
        displayName: 'Marketing Staff',
        role: 'staff',
        team: 'marketing',
    },
    {
        email: process.env.FIREBASE_ADMIN_EMAIL || 'admin@speedcopy.com',
        password: process.env.FIREBASE_ADMIN_PASSWORD || 'Admin@123456',
        displayName: process.env.FIREBASE_ADMIN_DISPLAY_NAME || 'SpeedCopy Admin',
        role: 'admin',
        team: 'ops',
    },
];

const ensureUser = async (auth, entry) => {
    let user;

    try {
        user = await auth.getUserByEmail(entry.email);
        await auth.updateUser(user.uid, {
            password: entry.password,
            displayName: entry.displayName,
            emailVerified: true,
            disabled: false,
        });
        console.log(`[Firebase] Updated ${entry.email}`);
    } catch (error) {
        if (error.code !== 'auth/user-not-found') {
            throw error;
        }

        user = await auth.createUser({
            email: entry.email,
            password: entry.password,
            displayName: entry.displayName,
            emailVerified: true,
            disabled: false,
        });
        console.log(`[Firebase] Created ${entry.email}`);
    }

    await auth.setCustomUserClaims(user.uid, {
        ...(user.customClaims || {}),
        role: entry.role,
        team: entry.team,
    });

    console.log(`[Firebase] Claims set for ${entry.email}: role=${entry.role}, team=${entry.team}`);
};

const main = async () => {
    try {
        const app = initFirebase();
        if (!app || !admin.apps.length) {
            throw new Error(
                'Firebase Admin SDK is not initialized. Check FIREBASE_SERVICE_ACCOUNT_PATH in auth-service .env.'
            );
        }

        const auth = admin.auth();

        for (const entry of STAFF_USERS) {
            await ensureUser(auth, entry);
        }

        console.log('\n[Firebase] Staff login accounts are ready:');
        STAFF_USERS.forEach((entry) => {
            console.log(`- ${entry.email} / ${entry.password}`);
        });
    } catch (error) {
        console.error('[Firebase] Failed to ensure staff users:', error.message || error);
        process.exitCode = 1;
    }
};

main();
