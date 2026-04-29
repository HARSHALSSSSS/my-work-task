import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { ChevronDown } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Colors, Spacing } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { SpeedCopyLogo } from '../../components/ui/SpeedCopyLogo';
import * as authApi from '../../api/auth';

const PHONE_DIGITS = 10;
const OTP_LEN = 6;
const COUNTRY_CODE = '+91';
const GOOGLE_WEB_CLIENT_ID_FALLBACK = '864282288881-obgn8m1een4393at1464gdfg3qsoc4fj.apps.googleusercontent.com';

WebBrowser.maybeCompleteAuthSession();

function GoogleLogoIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.652 32.657 29.243 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.958 3.042l5.657-5.657C34.125 6.053 29.313 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.958 3.042l5.657-5.657C34.125 6.053 29.313 4 24 4c-7.682 0-14.417 4.337-17.694 10.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.207 0 9.986-1.977 13.444-5.196l-6.219-5.238C29.153 35.091 26.684 36 24 36c-5.222 0-9.618-3.317-11.283-7.946l-6.522 5.025C9.438 39.556 16.227 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.078 5.566l6.219 5.238C36.999 39.216 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}

function resolveGoogleWebClientId(): string {
  const platformSpecificEnv =
    Platform.OS === 'android'
      ? [
          process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
          process.env.GOOGLE_ANDROID_CLIENT_ID,
          process.env.ANDROID_CLIENT_ID,
        ]
      : Platform.OS === 'ios'
        ? [
            process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
            process.env.GOOGLE_IOS_CLIENT_ID,
            process.env.IOS_CLIENT_ID,
          ]
        : [];

  const fromEnv = [
    ...platformSpecificEnv,
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.EXPO_PUBLIC_GC_CLIENT_ID,
    process.env.GC_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ]
    .map((v) => (v || '').trim())
    .find(Boolean);
  if (fromEnv) return fromEnv;

  const extra = ((Constants.expoConfig as any)?.extra || {}) as Record<string, unknown>;
  const platformSpecificExtra =
    Platform.OS === 'android'
      ? [extra.googleAndroidClientId, extra.GOOGLE_ANDROID_CLIENT_ID, extra.androidClientId]
      : Platform.OS === 'ios'
        ? [extra.googleIosClientId, extra.GOOGLE_IOS_CLIENT_ID, extra.iosClientId]
        : [];

  const fromExtra = [
    ...platformSpecificExtra,
    extra.googleWebClientId,
    extra.googleClientId,
    extra.gcClientId,
    extra.GC_CLIENT_ID,
    extra.GOOGLE_WEB_CLIENT_ID,
    extra.GOOGLE_CLIENT_ID,
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .find(Boolean);

  return fromExtra || GOOGLE_WEB_CLIENT_ID_FALLBACK;
}

export function LoginScreen() {
  const { colors: t } = useThemeStore();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setPhone = useAuthStore((s) => s.setPhone);

  const [phoneLocal, setPhoneLocal] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [mockOtpMode, setMockOtpMode] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  const phoneDigits = phoneLocal.replace(/\D/g, '').slice(0, PHONE_DIGITS);
  const canSendOtp = phoneDigits.length === PHONE_DIGITS;
  const otpFilled = otp.every((d) => d.length === 1);

  const handlePhoneChange = useCallback((text: string) => {
    const next = text.replace(/\D/g, '').slice(0, PHONE_DIGITS);
    setPhoneLocal(next);
  }, []);

  const resetToPhoneEntry = useCallback(() => {
    setOtpSent(false);
    setMockOtpMode(false);
    setOtp(Array(OTP_LEN).fill(''));
  }, []);

  const handleSendOtp = useCallback(async () => {
    if (!canSendOtp || sending) return;
    setSending(true);

    try {
      await authApi.sendPhoneOtp(`${COUNTRY_CODE}${phoneDigits}`);
      setMockOtpMode(false);
      setOtpSent(true);
      requestAnimationFrame(() => otpRefs.current[0]?.focus());
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.serverMessage || e?.message || 'Failed to send OTP. Please try again.';
      const lowerMsg = String(msg).toLowerCase();
      const canUseDevMockOtp = __DEV__ && (
        lowerMsg.includes('phone otp is not configured')
        || lowerMsg.includes('network error')
        || lowerMsg.includes('cannot connect')
      );
      if (canUseDevMockOtp) {
        setMockOtpMode(true);
        setOtpSent(true);
        setOtp(Array(OTP_LEN).fill(''));
        requestAnimationFrame(() => otpRefs.current[0]?.focus());
        Alert.alert(
          'Dev OTP Mode',
          'OTP service is unavailable. Enter any 6 digits to continue in development mode.',
        );
        return;
      }
      Alert.alert('Could not send OTP', msg);
    } finally {
      setSending(false);
    }
  }, [canSendOtp, sending, phoneDigits]);

  const handleOtpDigitChange = useCallback((index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, OTP_LEN).split('');
      setOtp((prev) => {
        const next = [...prev];
        chars.forEach((c, j) => {
          const pos = index + j;
          if (pos < OTP_LEN) next[pos] = c;
        });
        return next;
      });
      const lastIndex = Math.min(index + chars.length - 1, OTP_LEN - 1);
      requestAnimationFrame(() => otpRefs.current[lastIndex]?.focus());
      return;
    }
    const digit = cleaned.slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LEN - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleOtpKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const handleVerify = useCallback(async () => {
    if (!otpFilled || verifying) return;
    setVerifying(true);
    try {
      const authData = mockOtpMode
        ? await authApi.verifyFirebaseToken(`mock_${phoneDigits}_user`)
        : await authApi.verifyPhoneOtp(`${COUNTRY_CODE}${phoneDigits}`, otp.join(''));
      const { user } = authData;
      useAuthStore.setState({ userId: user._id });
      useAuthStore.getState().setUserName(user.name);
      useAuthStore.getState().setUserEmail(user.email);
      setPhone(`${COUNTRY_CODE}${phoneDigits}`);
      setAuthenticated(true);
    } catch (e: any) {
      let msg = 'Verification failed. Please try again.';
      if (e.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e.serverMessage) {
        msg = e.serverMessage;
      } else if (e.message?.includes('Network')) {
        msg = Platform.OS === 'android'
          ? 'Cannot connect to server. Make sure backend is running and run: adb reverse tcp:4000 tcp:4000'
          : 'Cannot connect to the server. Make sure the backend is running.';
      } else if (e.message) {
        msg = e.message;
      }
      Alert.alert('Error', msg);
    } finally {
      setVerifying(false);
    }
  }, [otpFilled, verifying, mockOtpMode, phoneDigits, otp, setAuthenticated, setPhone]);

  const handleGoogleSignIn = useCallback(async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const clientId = resolveGoogleWebClientId();
      if (!clientId) {
        Alert.alert(
          'Google not configured',
          'Set one of these: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_GOOGLE_CLIENT_ID, or EXPO_PUBLIC_GC_CLIENT_ID.',
        );
        return;
      }

      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'speedcopy', path: 'oauthredirect' });
      const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}-${Math.random()}`,
      );

      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        extraParams: { nonce },
      });
      const result = await request.promptAsync(discovery);
      if (result.type !== 'success') {
        return;
      }
      const idToken = result.params?.id_token;
      if (!idToken) {
        Alert.alert('Google Sign-In failed', 'No id_token returned.');
        return;
      }
      const { user } = await authApi.verifyGoogleIdToken(idToken);
      useAuthStore.setState({ userId: user._id });
      useAuthStore.getState().setUserName(user.name);
      useAuthStore.getState().setUserEmail(user.email);
      if (user.phone) setPhone(user.phone);
      setAuthenticated(true);
    } catch (e: any) {
      Alert.alert('Google Sign-In failed', e?.serverMessage || e?.message || 'Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading, setAuthenticated, setPhone]);

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroBlock}>
            <Text style={[styles.welcomeLabel, { color: t.textSecondary }]}>Welcome To</Text>
            <SpeedCopyLogo size="lg" />
            <Text style={[styles.heroSub, { color: t.textSecondary }]}>
              Enter your phone number to sign in or create an account.
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>Mobile Number</Text>
            <View style={[styles.phoneRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
              <View style={[styles.prefixBox, { borderRightColor: t.border }]}>
                <Text style={[styles.prefixText, { color: t.textPrimary }]}>{COUNTRY_CODE}</Text>
                <ChevronDown size={14} color={t.textSecondary} />
              </View>
              <TextInput
                style={[styles.phoneInput, { color: t.textPrimary }]}
                value={phoneLocal}
                onChangeText={handlePhoneChange}
                placeholder="Enter 10 Digit mobile number"
                placeholderTextColor={t.placeholder}
                keyboardType="number-pad"
                maxLength={PHONE_DIGITS}
                editable={!otpSent}
                returnKeyType="done"
              />
              {otpSent && (
                <TouchableOpacity onPress={resetToPhoneEntry} style={styles.changeBtn}>
                  <Text style={[styles.changeText, { color: Colors.blueAccent }]}>Change</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!otpSent ? (
            <>
              <TouchableOpacity
                style={[styles.sendOtpBtn, { borderColor: t.textPrimary }, !canSendOtp && styles.sendOtpBtnDisabled]}
                onPress={handleSendOtp}
                activeOpacity={0.85}
                disabled={!canSendOtp || sending}
              >
                {sending ? (
                  <ActivityIndicator color={t.textPrimary} />
                ) : (
                  <Text style={[styles.sendOtpText, { color: t.textPrimary }, !canSendOtp && styles.sendOtpTextDisabled]}>
                    Send OTP
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.orRow}>
                <View style={[styles.orLine, { backgroundColor: t.border }]} />
                <Text style={[styles.orText, { color: t.textSecondary }]}>OR</Text>
                <View style={[styles.orLine, { backgroundColor: t.border }]} />
              </View>

              <TouchableOpacity
                style={[styles.googleBtn, { borderColor: t.border }]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.85}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color={t.textPrimary} />
                ) : (
                  <View style={styles.googleBtnContent}>
                    <View style={[styles.googleIconWrap, { backgroundColor: t.card, borderColor: t.border }]}>
                      <GoogleLogoIcon />
                    </View>
                    <Text style={[styles.googleBtnText, { color: t.textPrimary }]}>Continue with Google</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.otpBlock}>
                <Text style={[styles.fieldLabel, { color: t.textPrimary }]}>Enter OTP</Text>
                <View style={styles.otpRow}>
                  {otp.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={(r) => { otpRefs.current[idx] = r; }}
                      style={[styles.otpBox, { backgroundColor: t.inputBg, borderColor: t.border, color: t.textPrimary }]}
                      value={digit}
                      onChangeText={(v) => handleOtpDigitChange(idx, v)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(idx, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      textContentType="oneTimeCode"
                      autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                    />
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.sendOtpBtn, { borderColor: t.textPrimary }, !otpFilled && styles.sendOtpBtnDisabled]}
                onPress={handleVerify}
                activeOpacity={0.85}
                disabled={!otpFilled || verifying}
              >
                {verifying ? (
                  <ActivityIndicator color={t.textPrimary} />
                ) : (
                  <Text style={[styles.sendOtpText, { color: t.textPrimary }, !otpFilled && styles.sendOtpTextDisabled]}>
                    Verify
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={resetToPhoneEntry} style={styles.resendRow}>
                <Text style={[styles.resendText, { color: t.textSecondary }]}>
                  Didn't receive OTP?{' '}
                </Text>
                <Text style={[styles.resendLink, { color: t.textPrimary }]}>Resend</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  heroBlock: {
    alignItems: 'center',
    marginBottom: 36,
    marginTop: 32,
    gap: 8,
  },
  welcomeLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: '#6B6B6B',
    marginBottom: 2,
  },
  heroSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#6B6B6B',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  fieldBlock: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    marginBottom: 10,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 15,
    gap: 4,
    borderRightWidth: 0.5,
    borderRightColor: '#E0E0E0',
  },
  prefixText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#000000',
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#000000',
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  changeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  changeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  sendOtpBtn: {
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sendOtpBtnDisabled: {
    borderColor: '#C0C0C0',
  },
  sendOtpText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#000000',
  },
  sendOtpTextDisabled: {
    color: '#C0C0C0',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontFamily: 'Poppins_500Medium', fontSize: 12, letterSpacing: 1 },
  googleBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  googleBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  otpBlock: {
    marginBottom: Spacing.xl,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  otpBox: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    color: '#000000',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
  },
  resendLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

