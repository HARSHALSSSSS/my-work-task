/**
 * Firebase Admin SDK wrapper.
 * If credentials are not configured, falls back to MOCK MODE.
 * Mock mode works perfectly for development — no Firebase account needed.
 *
 * To switch to real Firebase:
 *   1. Download serviceAccountKey.json from Firebase Console
 *   2. Place it at: backend/config/firebase-key.json
 */
const admin = require('firebase-admin');
const path = require('path');

let useMock = false;

const initFirebase = () => {
    if (admin.apps.length) return admin.apps[0];

    let credential = null;

    // Option A: service account JSON file at backend/config/firebase-key.json
    try {
        const keyPath = path.resolve(__dirname, '../../../config/firebase-key.json');
        const serviceAccount = require(keyPath);
        credential = admin.credential.cert(serviceAccount);
        console.log('[Firebase] ✅ Using firebase-key.json from backend/config/');
    } catch (err) {
        // File not found, try other options
    }

    // Option B: FIREBASE_SERVICE_ACCOUNT_PATH env var
    if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        try {
            const p = path.resolve(__dirname, '../..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            credential = admin.credential.cert(require(p));
            console.log('[Firebase] ✅ Using FIREBASE_SERVICE_ACCOUNT_PATH from .env');
        } catch {
            /* file not found */
        }
    }

    // Option C: individual env vars
    if (!credential && process.env.FIREBASE_PROJECT_ID) {
        credential = admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        });
        console.log('[Firebase] ✅ Using individual env vars');
    }

    if (!credential) {
        useMock = true;
        console.log('[Firebase] 🔧 MOCK MODE — using dummy auth (no credentials configured)');
        return null;
    }

    admin.initializeApp({ credential });
    console.log('[Firebase] ✅ Admin SDK initialized with real credentials');
    return admin.apps[0];
};

/**
 * Verifies a Firebase ID token.
 * In MOCK MODE: accepts any token in format "mock_<uid>_<role>"
 * e.g. "mock_user123_user" or "mock_admin1_admin"
 */
const verifyIdToken = async (idToken) => {
    if (useMock) {
        // Mock token format: mock_<uid>_<role>
        // Role can contain underscores (e.g. delivery_partner), so split only on first 2 underscores
        if (idToken && idToken.startsWith('mock_')) {
            const withoutPrefix = idToken.slice(5); // remove "mock_"
            const firstUnderscore = withoutPrefix.indexOf('_');
            const uid =
                firstUnderscore >= 0 ? withoutPrefix.slice(0, firstUnderscore) : withoutPrefix;
            const role = firstUnderscore >= 0 ? withoutPrefix.slice(firstUnderscore + 1) : 'user';
            return {
                uid,
                email: `${uid}@mock.speedcopy.com`,
                name: `Mock ${role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')}`,
                picture: '',
                email_verified: true,
                phone_number: null,
                _mockRole: role,
            };
        }
        throw Object.assign(new Error('Invalid mock token. Use format: mock_<uid>_<role>'), {
            statusCode: 401,
        });
    }

    // Real Firebase verification
    return admin.auth().verifyIdToken(idToken);
};

const getFirebaseAuth = () => {
    if (useMock || !admin.apps.length) return null;
    return admin.auth();
};

const isFirebaseMockMode = () => useMock;

module.exports = { initFirebase, verifyIdToken, getFirebaseAuth, isFirebaseMockMode };
