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

function isImageLikeFile(file?: string): boolean {
  const raw = String(file || '').toLowerCase();
  if (!raw) return false;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('file:') || raw.startsWith('content:') || raw.startsWith('/uploads/')) {
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => raw.includes(ext));
  }
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => raw.includes(ext));
}

function resolveUploadedFilePreviewUri(item?: Partial<CartItem> | null): string {
  const uploaded = item?.printConfig?.uploadedFile;
  const previewCandidate = String(
    uploaded?.previewImage
    || uploaded?.thumbnailUrl
    || uploaded?.previewUrl
    || '',
  ).trim();
  if (previewCandidate) return previewCandidate;

  const rawUrl = String(uploaded?.url || '').trim();
  return isImageLikeFile(rawUrl) ? rawUrl : '';
}

function resolveCartItemThumbnail(item?: Partial<CartItem> | null): string {
  if (!item) return '';

  const uploadedPreview = resolveUploadedFilePreviewUri(item);
  if (uploadedPreview) return uploadedPreview;

  if (isImageLikeFile(item.image)) return String(item.image || '');
  if (isImageLikeFile(item.printConfig?.fileUri)) return String(item.printConfig?.fileUri || '');
  return String(item.image || '');
}

function findMatchingLocalItem(backendItem: cartApi.BackendCartItem, localItems: CartItem[]): CartItem | undefined {
  const printConfigId = String(backendItem.printConfigId || '').trim();
  if (printConfigId) {
    const byPrintConfig = localItems.find((item) => String(item.printConfigId || '').trim() === printConfigId);
    if (byPrintConfig) return byPrintConfig;
  }

  const designId = String(backendItem.designId || '').trim();
  if (designId) {
    const byDesign = localItems.find((item) => String(item.designId || '').trim() === designId);
    if (byDesign) return byDesign;
  }

  const productId = String(backendItem.productId || '').trim();
  const flowType = backendItem.flowType;
  const productName = String(backendItem.productName || '').trim();
  if (!productId) return undefined;

  return localItems.find((item) => (
    String(item.backendProductId || '').trim() === productId
    && (item.flowType || inferFlowTypeFromItemId(item.id)) === flowType
    && String(item.name || '').trim() === productName
  ));
}

function mapBackendToLocal(
  b: cartApi.BackendCart,
  existingItems: CartItem[] = [],
): { items: CartItem[]; backendCartId: string | null } {
  return {
    backendCartId: b._id || null,
    items: b.items.map((bi) => {
      const localMatch = findMatchingLocalItem(bi, existingItems);
      const backendImage = getProductImageUrl(bi) || bi.thumbnail || '';
      const mergedImage = resolveCartItemThumbnail({
        ...localMatch,
        image: backendImage || localMatch?.image,
      });

      return {
        ...localMatch,
        id: bi._id,
        backendProductId: bi.productId || localMatch?.backendProductId,
        designId: bi.designId || localMatch?.designId,
        printConfigId: bi.printConfigId || localMatch?.printConfigId,
        businessPrintConfigId: bi.businessPrintConfigId || localMatch?.businessPrintConfigId,
        type:
          bi.flowType === 'printing'
            ? 'printing' as const
            : bi.flowType === 'gifting'
              ? 'gifting' as const
              : 'product' as const,
        flowType: bi.flowType,
        quantity: bi.quantity,
        price: bi.unitPrice,
        name: bi.productName || localMatch?.name || '',
        image: mergedImage || backendImage || '',
      };
    }),
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
      const thumbnailForBackend = resolveCartItemThumbnail(item);
      const backendCart = await cartApi.addToCart({
        productId: productIdForBackend,
        productName: item.name,
        flowType,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        thumbnail: thumbnailForBackend,
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
      set((state) => {
        const mapped = mapBackendToLocal(cart, state.items);
        return { ...mapped, syncing: false };
      });
    } catch {
      set({ syncing: false });
    }
  },
}));
