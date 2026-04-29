import * as productsApi from '../api/products';
import { CartItem } from '../types';
import { isLikelyMongoId } from './product';

export type LiveStockState = {
  inStock: boolean;
  availableStock: number | null;
  message?: string;
};

/**
 * Check if a product should be shown as in-stock in catalog listings.
 *
 * WORKAROUND: Backend pre('validate') hook incorrectly overrides admin's
 * `in_stock: true` to `false` for shopping products without variants
 * when stock defaults to 0. We detect this and treat as available for
 * browsing. Backend checkout still validates real stock.
 */
export function isCatalogProductInStock(product: any): boolean {
  const apiInStock = product?.in_stock ?? product?.inStock;

  // If backend explicitly says in_stock=true, trust it
  if (apiInStock === true) return true;

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const rawStock = typeof product?.stock === 'number' ? product.stock : null;

  // Detect backend bug: shopping products without variants get in_stock=false
  // because backend pre('validate') hook does: this.in_stock = this.stock > 0
  // and stock defaults to 0 when not provided.
  if (apiInStock === false && variants.length === 0 && rawStock === 0) {
    return true;
  }

  // Products with variants: check variant stock (backend handles this correctly)
  if (variants.length > 0) {
    return variants.some((v: any) => (v?.stock || 0) > 0);
  }

  // Fallback: trust backend's explicit flag
  return Boolean(apiInStock);
}

function resolveAvailableStock(product: any): number | null {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length > 0) {
    return variants.reduce((sum: number, variant: any) => sum + Math.max(0, Number(variant?.stock || 0)), 0);
  }
  if (typeof product?.stock === 'number' && Number.isFinite(product.stock)) {
    return Math.max(0, product.stock);
  }
  return null;
}

/**
 * Get live stock state for a product detail page or cart.
 *
 * WORKAROUND: Same backend bug as above — shopping products without variants
 * get in_stock=false when stock defaults to 0. We detect this and treat as
 * available. Checkout validation (strict_stock) catches genuine stock issues.
 */
export function getLiveStockState(product: any, requestedQty = 1): LiveStockState {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const apiInStock = product?.in_stock ?? product?.inStock;
  const rawStock = typeof product?.stock === 'number' ? product.stock : null;

  // Detect backend bug for shopping products without variants
  const isLikelyBackendBug = apiInStock === false && variants.length === 0 && rawStock === 0;

  if (isLikelyBackendBug) {
    // Treat as available for UI; backend will validate at checkout
    return { inStock: true, availableStock: null, message: '' };
  }

  const availableStock = resolveAvailableStock(product);
  const hasUnits = availableStock === null ? apiInStock !== false : availableStock > 0;
  const enoughUnits = availableStock === null ? hasUnits : availableStock >= requestedQty;
  const inStock = Boolean(apiInStock !== false && hasUnits && enoughUnits);

  if (!inStock) {
    if (availableStock === 0) {
      return { inStock: false, availableStock: 0, message: 'Out of stock' };
    }
    if (availableStock !== null && availableStock < requestedQty) {
      return {
        inStock: false,
        availableStock,
        message: `Only ${availableStock} left in stock`,
      };
    }
    return { inStock: false, availableStock, message: 'Currently unavailable' };
  }

  return { inStock: true, availableStock, message: '' };
}

function getItemFlowType(item: CartItem): 'printing' | 'gifting' | 'shopping' {
  if (item.flowType) return item.flowType;
  if (item.type === 'printing') return 'printing';
  if (item.type === 'gifting') return 'gifting';
  return 'shopping';
}

async function getProductForFlow(
  flowType: 'printing' | 'gifting' | 'shopping',
  backendProductId: string,
) {
  if (flowType === 'gifting') return productsApi.getGiftingProduct(backendProductId);
  if (flowType === 'shopping') return productsApi.getShoppingProduct(backendProductId);
  return productsApi.getProductById(backendProductId);
}

export async function fetchCartStockMap(items: CartItem[]): Promise<Record<string, LiveStockState>> {
  const entries = await Promise.all(items.map(async (item) => {
    const flowType = getItemFlowType(item);
    const backendProductId = String(item.backendProductId || '').trim();

    if (flowType === 'printing') {
      return [item.id, { inStock: true, availableStock: null, message: '' } satisfies LiveStockState] as const;
    }

    if (!isLikelyMongoId(backendProductId)) {
      return [item.id, {
        inStock: false,
        availableStock: null,
        message: 'Product is unavailable. Please add it again.',
      } satisfies LiveStockState] as const;
    }

    try {
      const product = await getProductForFlow(flowType, backendProductId);
      return [item.id, getLiveStockState(product, item.quantity)] as const;
    } catch {
      return [item.id, { inStock: true, availableStock: null, message: '' } satisfies LiveStockState] as const;
    }
  }));

  return Object.fromEntries(entries);
}
