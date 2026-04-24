/**
 * Ensure Firebase + auth-service records exist for admin, vendor, and staff test users.
 *
 * Usage:
 *   npm run firebase:ensure-portals
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const admin = require('firebase-admin');
const { initFirebase } = require('../src/config/firebase');
const config = require('../src/config');
const User = require('../src/models/user.model');

const DEFAULT_USERS = [
    {
        key: 'admin',
        email: process.env.FIREBASE_ADMIN_EMAIL || 'admin@speedcopy.com',
        password: process.env.FIREBASE_ADMIN_PASSWORD || 'Admin@123456',
        displayName: process.env.FIREBASE_ADMIN_DISPLAY_NAME || 'SpeedCopy Admin',
        role: 'admin',
        phone: process.env.FIREBASE_ADMIN_PHONE || '',
        profile: {},
    },
    {
        key: 'vendor',
        email: process.env.FIREBASE_VENDOR_EMAIL || 'vendor@speedcopy.com',
        password: process.env.FIREBASE_VENDOR_PASSWORD || 'Vendor@123456',
        displayName: process.env.FIREBASE_VENDOR_DISPLAY_NAME || 'SpeedCopy Vendor',
        role: 'vendor',
        phone: process.env.FIREBASE_VENDOR_PHONE || '',
        profile: {
            vendorDetails: {
                businessName: 'SpeedCopy Vendor Org',
                businessAddress: 'Connaught Place, New Delhi',
                gstNumber: 'GST123456789',
                isApproved: true,
            },
        },
    },
    {
        key: 'staff',
        email: process.env.FIREBASE_STAFF_EMAIL || 'staff@speedcopy.com',
        password: process.env.FIREBASE_STAFF_PASSWORD || 'Staff@123456',
        displayName: process.env.FIREBASE_STAFF_DISPLAY_NAME || 'SpeedCopy Staff',
        role: 'staff',
        phone: process.env.FIREBASE_STAFF_PHONE || '',
        profile: {
            staffProfile: {
                team: process.env.FIREBASE_STAFF_TEAM || 'ops',
                permissions: [],
                scopes: [],
            },
        },
    },
];

const ensureFirebaseUser = async (auth, userConfig) => {
    const { email, password, displayName, phone, role } = userConfig;
    let firebaseUser;

    try {
        firebaseUser = await auth.getUserByEmail(email);
        firebaseUser = await auth.updateUser(firebaseUser.uid, {
            password,
            displayName,
            phoneNumber: phone || undefined,
            emailVerified: true,
            disabled: false,
        });
        console.log(`[Firebase] Updated ${role}: ${email} (${firebaseUser.uid})`);
    } catch (error) {
        if (error.code !== 'auth/user-not-found') {
            throw error;
        }

        firebaseUser = await auth.createUser({
            email,
            password,
            displayName,
            phoneNumber: phone || undefined,
            emailVerified: true,
            disabled: false,
        });
        console.log(`[Firebase] Created ${role}: ${email} (${firebaseUser.uid})`);
    }

    await auth.setCustomUserClaims(firebaseUser.uid, {
        ...(firebaseUser.customClaims || {}),
        role,
    });

    return firebaseUser;
};

const ensureMongoProfile = async (firebaseUser, userConfig) => {
    const { email, displayName, phone, role, profile } = userConfig;

    const update = {
        firebaseUid: firebaseUser.uid,
        email,
        name: displayName,
        phone,
        role,
        isEmailVerified: true,
        isActive: true,
        ...profile,
    };

    const user = await User.findOneAndUpdate(
        {
            $or: [{ firebaseUid: firebaseUser.uid }, { email }],
        },
        {
            $set: update,
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );

    console.log(`[Mongo] Upserted ${role}: ${user.email}`);
};

const run = async () => {
    try {
        const app = initFirebase();
        if (!app || !admin.apps.length) {
            throw new Error('Firebase Admin SDK is not initialized. Check FIREBASE_SERVICE_ACCOUNT_PATH.');
        }

        await mongoose.connect(config.mongoUri, { family: 4 });
        const auth = admin.auth();

        for (const userConfig of DEFAULT_USERS) {
            const firebaseUser = await ensureFirebaseUser(auth, userConfig);
            await ensureMongoProfile(firebaseUser, userConfig);
        }

        console.log('\nReady-to-use Firebase logins:');
        DEFAULT_USERS.forEach(({ role, email, password }) => {
            console.log(`- ${role}: ${email} / ${password}`);
        });
    } catch (error) {
        console.error('[Firebase] Failed to ensure portal users:', error.message || error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
};

run();
