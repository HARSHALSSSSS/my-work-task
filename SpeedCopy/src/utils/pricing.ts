export type ResolvedPricing = {
  price: number;
  originalPrice?: number;
  discountLabel?: string;
};

function firstFiniteNumber(...values: any[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

export function resolveProductPricing(product: any): ResolvedPricing {
  const salePrice = firstFiniteNumber(
    product?.sale_price,
    product?.discounted_price,
    product?.discountedPrice,
    product?.salePrice,
  );
  const mrp = firstFiniteNumber(
    product?.mrp,
    product?.base_price,
    product?.basePrice,
    product?.originalPrice,
  );
  const fallbackPrice = firstFiniteNumber(
    product?.price,
    mrp,
    salePrice,
    0,
  ) ?? 0;
  const price = salePrice ?? fallbackPrice;
  const originalPrice = typeof mrp === 'number' && mrp > price ? mrp : undefined;
  const discountLabel =
    typeof product?.discount_pct === 'number'
      ? `${product.discount_pct}% OFF`
      : typeof product?.badge === 'string' && product.badge.trim()
        ? product.badge.trim()
        : undefined;

  return { price, originalPrice, discountLabel };
}
