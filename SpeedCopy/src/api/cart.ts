import api from './client';

type Res<T> = { success: boolean; data: T; message?: string };

export interface BackendCartItem {
  _id: string;
  productId: string;
  productName: string;
  flowType: 'printing' | 'gifting' | 'shopping';
  thumbnail?: string;
  printConfigId?: string;
  businessPrintConfigId?: string;
  designId?: string;
  variantId?: string;
  variantIndex?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BackendCart {
  _id: string;
  userId: string;
  items: BackendCartItem[];
  subtotal: number;
}

export async function getCart(): Promise<BackendCart> {
  const { data } = await api.get<Res<BackendCart>>('/api/orders/cart');
  return data.data;
}

export async function addToCart(body: {
  productId: string;
  productName: string;
  flowType: 'printing' | 'gifting' | 'shopping';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnail?: string;
  printConfigId?: string;
  businessPrintConfigId?: string;
  designId?: string;
}): Promise<BackendCart> {
  const { data } = await api.post<Res<BackendCart>>('/api/orders/cart', body);
  return data.data;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<BackendCart> {
  const { data } = await api.patch<Res<BackendCart>>(`/api/orders/cart/${itemId}`, { quantity });
  return data.data;
}

export async function removeCartItem(itemId: string): Promise<BackendCart> {
  const { data } = await api.delete<Res<BackendCart>>(`/api/orders/cart/${itemId}`);
  return data.data;
}

export async function clearCart(): Promise<void> {
  const cart = await getCart();
  const itemIds = (cart?.items || [])
    .map((item) => item?._id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (!itemIds.length) return;

  await Promise.allSettled(itemIds.map((itemId) => removeCartItem(itemId)));
}

export async function applyCoupon(code: string, subtotal: number, flowType?: string) {
  const { data } = await api.post<Res<{
    couponCode: string;
    discountType: string;
    discountValue: number;
    discount: number;
    finalTotal: number;
  }>>('/api/orders/cart/apply-coupon', { code, subtotal, flowType });
  return data.data;
}
