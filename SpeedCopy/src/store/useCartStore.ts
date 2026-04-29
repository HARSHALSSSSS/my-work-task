import { create } from 'zustand';
import { CartItem } from '../types';
import * as cartApi from '../api/cart';
import { getToken } from '../api/client';
import { getProductImageUrl, inferFlowTypeFromItemId, isLikelyMongoId } from '../utils/product';

interface CartState {
  items: CartItem[];
  backendCartId: string | null;
  syncing: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  syncToBackend: (item: CartItem) => Promise<void>;
  fetchCart: () => Promise<void>;
}

function mapBackendToLocal(b: cartApi.BackendCart): { items: CartItem[]; backendCartId: string | null } {
  return {
    backendCartId: b._id || null,
    items: b.items.map((bi) => ({
      id: bi._id,
      backendProductId: bi.productId,
      designId: bi.designId,
      printConfigId: bi.printConfigId,
      businessPrintConfigId: bi.businessPrintConfigId,
      type:
        bi.flowType === 'printing'
          ? 'printing' as const
          : bi.flowType === 'gifting'
            ? 'gifting' as const
            : 'product' as const,
      flowType: bi.flowType,
      quantity: bi.quantity,
      price: bi.unitPrice,
      name: bi.productName,
      image: getProductImageUrl(bi) || bi.thumbnail || '',
    })),
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  backendCartId: null,
  syncing: false,

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
          ),
        };
      }
      return { items: [...state.items, item] };
    });
    get().syncToBackend(item);
  },

  removeItem: (id) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
    getToken().then((t) => { if (t) cartApi.removeCartItem(id).catch(() => {}); });
  },

  updateQuantity: (id, quantity) => {
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    }));
    getToken().then((t) => {
      if (!t) return;
      if (quantity <= 0) {
        cartApi.removeCartItem(id).catch(() => {});
      } else {
        cartApi.updateCartItem(id, quantity).catch(() => {});
      }
    });
  },

  clearCart: () => {
    set({ items: [], backendCartId: null });
    getToken().then((t) => { if (t) cartApi.clearCart().catch(() => {}); });
  },

  getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  syncToBackend: async (item) => {
    const token = await getToken();
    if (!token) return;
    try {
      const flowType =
        item.flowType ||
        (item.type === 'printing'
          ? 'printing'
          : item.type === 'gifting'
            ? 'gifting'
            : inferFlowTypeFromItemId(item.id));
      const safeBackendProductId = typeof item.backendProductId === 'string'
        ? item.backendProductId.trim()
        : '';
      const isCatalogFlow = flowType === 'shopping' || flowType === 'gifting';
      if (isCatalogFlow && !isLikelyMongoId(safeBackendProductId)) {
        console.warn(`[cart] Skipping ${flowType} sync: missing valid backendProductId`);
        return;
      }
      const productIdForBackend = isCatalogFlow
        ? safeBackendProductId
        : safeBackendProductId || item.id;
      const backendCart = await cartApi.addToCart({
        productId: productIdForBackend,
        productName: item.name,
        flowType,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        thumbnail: item.image,
        printConfigId: item.printConfigId,
        businessPrintConfigId: item.businessPrintConfigId,
        designId: item.designId,
      });
      set({ backendCartId: backendCart._id || null });
    } catch { /* local state already updated */ }
  },

  fetchCart: async () => {
    const token = await getToken();
    if (!token) return;
    set({ syncing: true });
    try {
      const cart = await cartApi.getCart();
      const mapped = mapBackendToLocal(cart);
      set({ ...mapped, syncing: false });
    } catch {
      set({ syncing: false });
    }
  },
}));
