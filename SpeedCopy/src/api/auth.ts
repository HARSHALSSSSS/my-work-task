import axios from 'axios';
import Constants from 'expo-constants';
import api, { API_BASE_URL, storeToken } from './client';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  photoURL?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  fcmToken?: string;
}

interface AuthResponse {
  success: boolean;
  data: { user: AuthUser; token: string };
  message?: string;
}

function resolveAuthServiceBaseUrl() {
  const env = (process.env.EXPO_PUBLIC_AUTH_API_URL || '').trim();
  if (env) return env.replace(/\/+$/, '');
  try {
    const parsed = new URL(API_BASE_URL);
    if (parsed.port === '4000') parsed.port = '4001';
    else if (!parsed.port) parsed.port = '4001';
    return parsed.origin;
  } catch {
    return 'http://localhost:4001';
  }
}

const authServiceApi = axios.create({
  baseURL: resolveAuthServiceBaseUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

function resolveLanBaseUrl(port: number): string | null {
  try {
    const debuggerHost =
      (Constants.expoConfig as any)?.hostUri ??
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
    if (!debuggerHost) return null;
    const host = String(debuggerHost).split(':')[0];
    if (!host) return null;
    return `http://${host}:${port}`;
  } catch {
    return null;
  }
}

const lanGatewayBase = resolveLanBaseUrl(4000);
const lanAuthBase = resolveLanBaseUrl(4001);

const lanGatewayApi = lanGatewayBase
  ? axios.create({
      baseURL: lanGatewayBase,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    })
  : null;

const lanAuthServiceApi = lanAuthBase
  ? axios.create({
      baseURL: lanAuthBase,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    })
  : null;

function shouldRetryAuthViaService(error: any): boolean {
  const status = error?.response?.status;
  if (!status) return true; // network / gateway unreachable
  return status >= 500;
}

async function postAuthWithFallback<T>(path: string, body: any): Promise<T> {
  const callers: Array<() => Promise<{ data: T }>> = [
    () => api.post<T>(path, body),
    () => authServiceApi.post<T>(path, body),
  ];
  if (lanGatewayApi) callers.push(() => lanGatewayApi.post<T>(path, body));
  if (lanAuthServiceApi) callers.push(() => lanAuthServiceApi.post<T>(path, body));

  let lastError: any;
  for (let i = 0; i < callers.length; i += 1) {
    try {
      const { data } = await callers[i]();
      return data;
    } catch (error) {
      lastError = error;
      if (!shouldRetryAuthViaService(error)) throw error;
    }
  }
  throw lastError;
}

export async function register(body: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<AuthResponse['data']> {
  const data = await postAuthWithFallback<AuthResponse>('/api/auth/register', body);
  await storeToken(data.data.token);
  return data.data;
}

export async function login(body: {
  email: string;
  password: string;
}): Promise<AuthResponse['data']> {
  const data = await postAuthWithFallback<AuthResponse>('/api/auth/login', body);
  await storeToken(data.data.token);
  return data.data;
}

export async function verifyFirebaseToken(idToken: string, role?: string): Promise<AuthResponse['data']> {
  const data = await postAuthWithFallback<AuthResponse>('/api/auth/verify', { idToken, role });
  await storeToken(data.data.token);
  return data.data;
}

export async function verifyGoogleIdToken(idToken: string, role?: string): Promise<AuthResponse['data']> {
  const data = await postAuthWithFallback<AuthResponse>('/api/auth/google-verify', { idToken, role });
  await storeToken(data.data.token);
  return data.data;
}

export async function sendPhoneOtp(phone: string): Promise<{ expiresIn?: number; devOtp?: string }> {
  const data = await postAuthWithFallback<{ success: boolean; data: any }>('/api/auth/phone/send-otp', { phone });
  return data.data || {};
}

export async function verifyPhoneOtp(phone: string, otp: string): Promise<AuthResponse['data']> {
  const data = await postAuthWithFallback<AuthResponse>('/api/auth/phone/verify-otp', { phone, otp });
  await storeToken(data.data.token);
  return data.data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<{ success: boolean; data: { user: AuthUser } }>('/api/auth/me');
  return data.data.user;
}
