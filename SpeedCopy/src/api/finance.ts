import api from './client';

type Res<T> = { success: boolean; data: T; message?: string };
const PATH_PREFERENCE = new Map<string, string>();

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeResponse = (error as { response?: { status?: number } }).response;
  return maybeResponse?.status === 404;
}

function pathKey(primaryPath: string, fallbackPath: string): string {
  return `${primaryPath}|${fallbackPath}`;
}

function resolvePath(primaryPath: string, fallbackPath: string): { first: string; second: string } {
  const preferred = PATH_PREFERENCE.get(pathKey(primaryPath, fallbackPath));
  if (preferred === fallbackPath) {
    return { first: fallbackPath, second: primaryPath };
  }
  return { first: primaryPath, second: fallbackPath };
}

function rememberPath(primaryPath: string, fallbackPath: string, successPath: string) {
  PATH_PREFERENCE.set(pathKey(primaryPath, fallbackPath), successPath);
}

async function getWithFallback<T>(primaryPath: string, fallbackPath: string, params?: Record<string, any>): Promise<T> {
  const { first, second } = resolvePath(primaryPath, fallbackPath);
  try {
    const { data } = await api.get<Res<T>>(first, params ? { params } : undefined);
    rememberPath(primaryPath, fallbackPath, first);
    return data.data;
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    const { data } = await api.get<Res<T>>(second, params ? { params } : undefined);
    rememberPath(primaryPath, fallbackPath, second);
    return data.data;
  }
}

async function postWithFallback<T>(primaryPath: string, fallbackPath: string, body?: Record<string, any>): Promise<T> {
  const { first, second } = resolvePath(primaryPath, fallbackPath);
  try {
    const { data } = await api.post<Res<T>>(first, body);
    rememberPath(primaryPath, fallbackPath, first);
    return data.data;
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    const { data } = await api.post<Res<T>>(second, body);
    rememberPath(primaryPath, fallbackPath, second);
    return data.data;
  }
}

export interface Wallet {
  _id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface LedgerEntry {
  _id: string;
  walletId: string;
  userId: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

export interface WalletOverview {
  wallet: Wallet;
  recent_entries: LedgerEntry[];
  topup_presets: number[];
  payment_methods: string[];
}

export interface ReferralSummary {
  my_code: string;
  reward_per_friend: number;
  totals: { total_earned: number; pending_rewards: number; friends_joined: number; total_referrals: number };
  recent_referrals: any[];
}

export async function getWallet(): Promise<Wallet> {
  return getWithFallback<Wallet>('/api/wallet', '/api/wallet/wallet');
}

export async function getWalletOverview(): Promise<WalletOverview> {
  return getWithFallback<WalletOverview>('/api/wallet/overview', '/api/wallet/wallet/overview');
}

export async function getWalletLedger(params?: { page?: number; limit?: number; category?: string }) {
  return getWithFallback<{ wallet: Wallet; entries: LedgerEntry[]; meta: any }>(
    '/api/wallet/ledger',
    '/api/wallet/wallet/ledger',
    params,
  );
}

export async function getTopupConfig() {
  return getWithFallback<any>('/api/wallet/topup-config', '/api/wallet/wallet/topup-config');
}

export async function topupPreview(amount: number) {
  return postWithFallback<{ amount: number; processing_fee: number; total_payable: number; currency: string }>(
    '/api/wallet/topup-preview',
    '/api/wallet/wallet/topup-preview',
    { amount },
  );
}

export async function confirmTopup(body: {
  amount: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
}) {
  return postWithFallback<{
    wallet: Wallet;
    entry: LedgerEntry;
    alreadyCredited: boolean;
  }>(
    '/api/wallet/razorpay/verify',
    '/api/wallet/wallet/razorpay/verify',
    {
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
      amount: Math.round(Number(body.amount || 0) * 100),
    },
  );
}

export async function initiateTopup(body: {
  orderId: string;
  amount: number;
  currency?: string;
}) {
  return postWithFallback<{
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
    mock?: boolean;
    note?: string;
  }>(
    '/api/wallet/razorpay/initiate',
    '/api/wallet/wallet/razorpay/initiate',
    body,
  );
}

export async function getReferralSummary(): Promise<ReferralSummary> {
  return getWithFallback<ReferralSummary>('/api/referrals/summary', '/api/referrals/referrals/summary');
}

export async function getReferrals(params?: { page?: number; limit?: number }) {
  return getWithFallback<any>('/api/referrals', '/api/referrals/referrals', params);
}

export async function applyReferralCode(code: string) {
  return postWithFallback<any>('/api/referrals/apply', '/api/referrals/referrals/apply', { code });
}
