const admin = require('firebase-admin');
const path = require('path');

try {
  const serviceAccount = require(path.join(__dirname, '../../../config/firebase-key.json'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'chat-application-294a9'
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  process.exit(1);
}

module.exports = admin;
