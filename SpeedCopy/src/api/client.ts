import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type RetryableConfig = {
  baseURL?: string;
  __baseRetryDone?: boolean;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveDebuggerHostIp(): string | null {
  const debuggerHost =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (!debuggerHost || typeof debuggerHost !== 'string') return null;
  const ip = debuggerHost.split(':')[0]?.trim();
  return ip || null;
}

function resolveLanBaseUrl(): string | null {
  const ip = resolveDebuggerHostIp();
  if (!ip) return null;
  return `http://${ip}:4000`;
}

function uniqueBaseUrls(urls: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  urls.forEach((u) => {
    if (!u) return;
    const normalized = normalizeBaseUrl(u);
    if (!out.includes(normalized)) out.push(normalized);
  });
  return out;
}

const EXPLICIT_ENV_URL = (process.env.EXPO_PUBLIC_API_URL || '').trim();
const LAN_BASE_URL = resolveLanBaseUrl();
const LOCAL_BASE_URL = Platform.OS === 'android' ? 'http://127.0.0.1:4000' : 'http://localhost:4000';

function getBaseUrl(): string {
  // Highest priority for manual local/LAN/prod overrides.
  if (EXPLICIT_ENV_URL) return normalizeBaseUrl(EXPLICIT_ENV_URL);
  // Prefer LAN in dev-client so physical devices can reach backend without adb reverse.
  if (LAN_BASE_URL) return normalizeBaseUrl(LAN_BASE_URL);
  // Fallback to localhost when LAN host is unavailable.
  return normalizeBaseUrl(LOCAL_BASE_URL);
}

export const API_BASE_URL = getBaseUrl();
const RETRY_BASE_URLS = uniqueBaseUrls(EXPLICIT_ENV_URL ? [] : [LAN_BASE_URL, LOCAL_BASE_URL])
  .filter((u) => u !== API_BASE_URL);

function isNetworkLikeError(error: any): boolean {
  if (!error || typeof error !== 'object') return false;
  if (error.response) return false;
  const message = String(error.message || '').toLowerCase();
  return (
    !!error.request
    || message.includes('network error')
    || message.includes('timeout')
    || message.includes('failed to connect')
    || message.includes('socket')
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'speedcopy_token';

export async function storeToken(token?: string | null) {
  const safeToken = typeof token === 'string' ? token.trim() : '';
  if (!safeToken) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, safeToken);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use(async (config: any) => {
  const token = await getToken();
  const safeToken = typeof token === 'string' ? token.trim() : '';
  const hasUsableToken = Boolean(
    safeToken
    && safeToken.toLowerCase() !== 'undefined'
    && safeToken.toLowerCase() !== 'null',
  );
  if (hasUsableToken) {
    if (!config.headers) config.headers = {};
    config.headers.Authorization = `Bearer ${safeToken}`;
  }
  if (config?.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }
  return config;
});

export class ApiError extends Error {
  status: number;
  serverMessage: string;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.serverMessage = message;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const cfg = (error as any)?.config as RetryableConfig | undefined;
    if (cfg && !cfg.__baseRetryDone && isNetworkLikeError(error) && RETRY_BASE_URLS.length > 0) {
      cfg.__baseRetryDone = true;
      let retryError: any = error;
      for (const fallbackBaseUrl of RETRY_BASE_URLS) {
        try {
          return await api.request({
            ...(cfg as any),
            baseURL: fallbackBaseUrl,
            __baseRetryDone: true,
          });
        } catch (err: any) {
          retryError = err;
          if (!isNetworkLikeError(err)) break;
        }
      }
      error = retryError;
    }

    const status = error.response?.status;
    const serverMsg = error.response?.data?.message || error.message;

    if (status === 401) {
      // Do not globally force logout on every unauthorized response.
      // Some non-auth APIs may transiently return 401 and should not kick user out.
      return Promise.reject(new ApiError(401, serverMsg || 'Unauthorized request. Please retry.'));
    }

    if (status === 403) {
      return Promise.reject(new ApiError(403, serverMsg || 'You do not have permission for this action.'));
    }

    if (status === 409) {
      return Promise.reject(new ApiError(409, serverMsg || 'This action conflicts with the current state.'));
    }

    return Promise.reject(error);
  },
);

export default api;
