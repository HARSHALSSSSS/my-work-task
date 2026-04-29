import { firebaseConfig, isFirebaseConfigured } from '../config/firebase';

const API_BASE = 'https://identitytoolkit.googleapis.com/v1';

interface SendCodeResponse {
  sessionInfo: string;
}

interface VerifyCodeResponse {
  idToken: string;
  refreshToken: string;
  localId: string;
  phoneNumber: string;
  isNewUser: boolean;
}

/**
 * Send OTP to a phone number using Firebase Identity Toolkit REST API.
 * Requires a reCAPTCHA token obtained from the WebView reCAPTCHA component.
 * Returns a sessionInfo string needed to verify the code later.
 */
export async function sendVerificationCode(
  phoneNumber: string,
  recaptchaToken: string,
): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Add your Firebase API key in src/config/firebase.ts',
    );
  }

  const url = `${API_BASE}/accounts:sendVerificationCode?key=${firebaseConfig.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, recaptchaToken }),
  });

  const data = await res.json();

  if (!res.ok) {
    const code = data?.error?.message || 'UNKNOWN_ERROR';
    throw new Error(mapFirebaseError(code));
  }

  return (data as SendCodeResponse).sessionInfo;
}

/**
 * Verify the OTP code the user entered.
 * Returns the Firebase ID token that should be sent to the backend.
 */
export async function verifyCode(
  sessionInfo: string,
  code: string,
): Promise<{ idToken: string; phoneNumber: string; isNewUser: boolean }> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured.');
  }

  const url = `${API_BASE}/accounts:signInWithPhoneNumber?key=${firebaseConfig.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionInfo, code }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorCode = data?.error?.message || 'UNKNOWN_ERROR';
    throw new Error(mapFirebaseError(errorCode));
  }

  const result = data as VerifyCodeResponse;
  return {
    idToken: result.idToken,
    phoneNumber: result.phoneNumber,
    isNewUser: result.isNewUser,
  };
}

function mapFirebaseError(code: string): string {
  const map: Record<string, string> = {
    INVALID_PHONE_NUMBER: 'Invalid phone number. Please check and try again.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please try again after some time.',
    QUOTA_EXCEEDED: 'SMS quota exceeded. Please try again later.',
    CAPTCHA_CHECK_FAILED: 'reCAPTCHA verification failed. Please try again.',
    MISSING_PHONE_NUMBER: 'Phone number is required.',
    SESSION_EXPIRED: 'OTP session expired. Please request a new OTP.',
    INVALID_SESSION_INFO: 'Invalid session. Please request a new OTP.',
    INVALID_CODE: 'Invalid OTP code. Please check and try again.',
    CODE_EXPIRED: 'OTP has expired. Please request a new one.',
    INVALID_TEMPORARY_PROOF: 'Verification failed. Please try again.',
  };
  return map[code] || `Verification failed (${code})`;
}
