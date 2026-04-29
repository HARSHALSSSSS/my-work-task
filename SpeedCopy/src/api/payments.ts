import api from './client';

type Res<T> = { success: boolean; data: T; message?: string };

export interface PaymentCreateResponse {
  payment: any;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  keyId: string;
  mock?: boolean;
  note?: string;
}

export interface PaymentVerifyResponse {
  _id: string;
  orderId: string;
  status: 'paid' | 'failed';
  mock?: boolean;
}

export interface UpiVerifyResponse {
  upiId: string;
  isValid: boolean;
  provider?: string;
  reason?: string;
}

export async function createPayment(body: {
  orderId: string;
  amount: number;
  currency?: string;
  method?: string;
}): Promise<PaymentCreateResponse> {
  const { data } = await api.post<Res<PaymentCreateResponse>>('/api/payments/create', body);
  return data.data;
}

export async function verifyPayment(body: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<PaymentVerifyResponse> {
  const { data } = await api.post<Res<PaymentVerifyResponse>>('/api/payments/verify', body);
  return data.data;
}

export async function verifyUpi(body: { upiId: string }): Promise<UpiVerifyResponse> {
  const normalized = String(body?.upiId || '').trim().toLowerCase();
  const isValid = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,63}$/i.test(normalized);
  return {
    upiId: normalized,
    isValid,
    reason: isValid ? undefined : 'Please enter a valid UPI ID format (example: name@bank).',
  };
}
