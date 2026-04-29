const admin = require('firebase-admin');

let useMock = false;

const initFirebase = () => {
    try {
        if (admin.apps.length) return admin.apps[0];

        let credential = null;

        // ONLY ENV-BASED CONFIG (Cloud Run safe)
        if (process.env.FIREBASE_PROJECT_ID) {
            credential = admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            });
            console.log('[Firebase] Using ENV credentials');
        }

        // 🔧 Fallback to mock mode (NO crash)
        if (!credential) {
            useMock = true;
            console.log('[Firebase] 🔧 MOCK MODE — no credentials');
            return null;
        }

        admin.initializeApp({ credential });
        console.log('[Firebase] Admin initialized');
        return admin.apps[0];

    } catch (err) {
        console.error('[Firebase] Init failed:', err.message);
        useMock = true;
        return null;
    }
};


const verifyIdToken = async (idToken) => {
    if (useMock) {
        if (idToken && idToken.startsWith('mock_')) {
            const withoutPrefix = idToken.slice(5);
            const firstUnderscore = withoutPrefix.indexOf('_');
            const uid =
                firstUnderscore >= 0 ? withoutPrefix.slice(0, firstUnderscore) : withoutPrefix;
            const role =
                firstUnderscore >= 0 ? withoutPrefix.slice(firstUnderscore + 1) : 'user';

            return {
                uid,
                email: `${uid}@mock.speedcopy.com`,
                name: `Mock ${role}`,
                email_verified: true,
                _mockRole: role,
            };
        }

        throw Object.assign(new Error('Invalid mock token'), { statusCode: 401 });
    }

    return admin.auth().verifyIdToken(idToken);
};

const getFirebaseAuth = () => {
    if (useMock || !admin.apps.length) return null;
    return admin.auth();
};

const isFirebaseMockMode = () => useMock;

module.exports = { initFirebase, verifyIdToken, getFirebaseAuth, isFirebaseMockMode };