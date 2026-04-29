/**
 * Firebase configuration for phone authentication.
 * Replace placeholder values with your Firebase project config.
 * Get them from: Firebase Console → Project Settings → General → Your apps → Web app
 *
 * While placeholders remain, the app runs in MOCK MODE (no real SMS sent).
 */
export const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export function isFirebaseConfigured(): boolean {
  return (
    firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
    firebaseConfig.apiKey.length > 10
  );
}
