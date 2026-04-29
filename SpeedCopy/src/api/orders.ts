import api from './client';

type Res<T> = { success: boolean; data: T; message?: string };

export interface OrderItem {
  productId: string;
  productName: string;
  flowType: 'printing' | 'gifting' | 'shopping';
  thumbnail?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  printConfigId?: string;
  businessPrintConfigId?: string;
  designId?: string;
}

export interface BackendOrder {
  _id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  shippingAddress?: any;
  status: string;
  paymentStatus: string;
  paymentId?: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  couponCode?: string;
  notes?: string;
  timeline: { status: string; note?: string; timestamp: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummary {
  total_orders: number;
  active_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  status_counts: Record<string, number>;
  recent_orders: BackendOrder[];
}

export async function createOrder(body: {
  items: OrderItem[];
  subtotal: number;
  total: number;
  shippingAddress?: any;
  pickupShopId?: string;
  discount?: number;
  deliveryCharge?: number;
  couponCode?: string;
  notes?: string;
}): Promise<BackendOrder> {
  const { data } = await api.post<Res<BackendOrder>>('/api/orders', body);
  return data.data;
}

export async function createShoppingOrder(body: {
  cart_id: string;
  address_id: string;
  coupon_code?: string;
}): Promise<BackendOrder> {
  const { data } = await api.post<Res<BackendOrder>>('/api/shop/orders', body);
  return data.data;
}

export async function createGiftingOrder(body: {
  cart_id: string;
  address_id: string;
  coupon_code?: string;
}): Promise<BackendOrder> {
  const { data } = await api.post<Res<BackendOrder>>('/api/gifting/orders', body);
  return data.data;
}

export async function getOrderSummary(): Promise<OrderSummary> {
  const { data } = await api.get<Res<OrderSummary>>('/api/orders/summary');
  return data.data;
}

export async function getOrders(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  const { data } = await api.get<Res<{ orders: BackendOrder[]; meta: any }>>('/api/orders', { params });
  return data.data;
}

export async function getOrder(id: string): Promise<BackendOrder> {
  const { data } = await api.get<Res<BackendOrder>>(`/api/orders/${id}`);
  return data.data;
}

export async function trackOrder(id: string) {
  const { data } = await api.get<Res<any>>(`/api/orders/${id}/track`);
  return data.data;
}

export async function reorder(id: string): Promise<BackendOrder> {
  const { data } = await api.post<Res<BackendOrder>>(`/api/orders/${id}/reorder`);
  return data.data;
}

// ─── Edit window & clarification (per guide) ────────
export async function getEditWindow(id: string) {
  const { data } = await api.get<Res<{ isEditable: boolean; editableUntil?: string; lockedReason?: string }>>(`/api/orders/${id}/edit-window`);
  return data.data;
}

export async function updateBeforeProduction(id: string, body: { notes: string }): Promise<BackendOrder> {
  const { data } = await api.patch<Res<BackendOrder>>(`/api/orders/${id}/before-production`, body);
  return data.data;
}

export async function respondToClarification(id: string, body: { response: string }): Promise<BackendOrder> {
  const { data } = await api.post<Res<BackendOrder>>(`/api/orders/${id}/clarification/respond`, body);
  return data.data;
}
