import { API_BASE_URL } from '../api/client';

export function isLikelyMongoId(value?: string | null): boolean {
  return /^[a-fA-F0-9]{24}$/.test(String(value || ''));
}

function hasAbsoluteAssetScheme(raw: string): boolean {
  return /^(https?:|file:|content:|data:)/i.test(raw);
}

function normalizeRelativeAssetPath(value: string): string {
  let raw = String(value || '').trim().replace(/\\/g, '/');
  if (!raw) return '';

  raw = raw.replace(/^\.\//, '');
  if (raw.startsWith('//')) return `https:${raw}`;

  const lowerRaw = raw.toLowerCase();
  const uploadsMarker = lowerRaw.indexOf('/uploads/');
  if (uploadsMarker >= 0) {
    return raw.slice(uploadsMarker);
  }

  if (lowerRaw.startsWith('uploads/')) {
    return `/${raw.replace(/^\/+/, '')}`;
  }

  if (/^\/?api\/uploads\//i.test(raw)) {
    return `/${raw.replace(/^\/?api\//i, '').replace(/^\/+/, '')}`;
  }

  if (raw.startsWith('/')) {
    return raw;
  }

  const likelyFilePath = /\.[a-z0-9]{2,6}([?#].*)?$/i.test(raw);
  if (likelyFilePath) {
    return `/uploads/${raw.replace(/^\/+/, '')}`;
  }

  return `/uploads/${raw.replace(/^\/+/, '')}`;
}

export function toAbsoluteAssetUrl(url?: string | null): string {
  let raw = String(url || '').trim();
  if (!raw) return '';

  if (!hasAbsoluteAssetScheme(raw) && !raw.startsWith('//')) {
    raw = normalizeRelativeAssetPath(raw);
  }

  if (hasAbsoluteAssetScheme(raw)) {
    try {
      const parsed = new URL(raw);
      const apiBase = new URL(API_BASE_URL);
      const hostname = parsed.hostname.toLowerCase();
      const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1';
      const isPrivateIpv4 = /^10\./.test(hostname)
        || /^192\.168\./.test(hostname)
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
      const isInternalServiceHost = !hostname.includes('.') && !isLocalHost;
      const uploadsPath = parsed.pathname.includes('/uploads/')
        ? parsed.pathname.slice(parsed.pathname.indexOf('/uploads/'))
        : '';
      const shouldRewriteToGateway = uploadsPath && (isLocalHost || isPrivateIpv4 || isInternalServiceHost);

      if (shouldRewriteToGateway) {
        return `${apiBase.origin}${uploadsPath}${parsed.search}${parsed.hash}`;
      }
      return raw;
    } catch {
      return raw;
    }
  }

  if (raw.startsWith('//')) return `https:${raw}`;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`;
}

const INVALID_IMAGE_VALUES = new Set([
  '',
  'undefined',
  'null',
  'nan',
  'none',
  'n/a',
  'na',
  'false',
  'true',
  '[object object]',
]);

function sanitizeImageCandidate(input: any): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (INVALID_IMAGE_VALUES.has(lower)) return '';
  if (lower.startsWith('javascript:')) return '';
  return trimmed;
}

function isProbablyValidImageUrl(input: string): boolean {
  const lower = String(input || '').toLowerCase();
  if (!lower) return false;
  if (lower.includes('/uploads/undefined') || lower.includes('/uploads/null')) return false;
  if (lower.endsWith('/uploads') || lower.endsWith('/uploads/')) return false;
  return true;
}

function pickFirstImageCandidate(input: any, depth = 0, seen?: WeakSet<object>): string {
  if (!input || depth > 4) return '';

  if (typeof input === 'string') {
    return sanitizeImageCandidate(input);
  }

  if (Array.isArray(input)) {
    for (const entry of input) {
      const picked = pickFirstImageCandidate(entry, depth + 1, seen);
      if (picked) return picked;
    }
    return '';
  }

  if (typeof input === 'object') {
    const tracked = seen || new WeakSet<object>();
    if (tracked.has(input)) return '';
    tracked.add(input);

    const direct = [
      input.url,
      input.uri,
      input.src,
      input.image,
      input.imageUri,
      input.imagePath,
      input.image_path,
      input.path,
      input.secure_url,
      input.original,
      input.optimized,
      input.thumbnail,
      input.thumbnailImage,
      input.thumbnail_image,
      input.thumbnailUrl,
      input.thumbnail_url,
      input.thumb,
      input.thumbUrl,
      input.thumb_url,
      input.imageUrl,
      input.imageURL,
      input.image_url,
      input.productImage,
      input.product_image,
      input.variantImage,
      input.variant_image,
      input.displayImage,
      input.display_image,
      input.primaryImage,
      input.primary_image,
      input.defaultImage,
      input.default_image,
      input.featuredImage,
      input.featured_image,
      input.mainImage,
      input.main_image,
      input.coverImage,
      input.cover_image,
      input.preview,
      input.previewImage,
      input.preview_image,
      input.preview_url,
      input.fileUrl,
      input.file_url,
      input.asset,
      input.assetUrl,
      input.asset_url,
      input.poster,
      input.banner,
      input.photo,
      input.picture,
      input.img,
    ];

    for (const value of direct) {
      const picked = sanitizeImageCandidate(value);
      if (picked) return picked;
    }

    const nested = [
      input.images,
      input.imageCandidates,
      input.media,
      input.gallery,
      input.assets,
      input.assetList,
      input.asset_list,
      input.files,
      input.attachments,
      input.variants,
      input.variant,
      input.variantSnapshot,
      input.variant_snapshot,
      input.selectedVariant,
      input.selected_variant,
      input.defaultVariant,
      input.default_variant,
      input.options,
      input.option,
      input.product,
      input.productRef,
      input.product_ref,
      input.productSnapshot,
      input.product_snapshot,
      input.item,
      input.itemSnapshot,
      input.item_snapshot,
      input.items,
      input.orderItems,
      input.order_items,
      input.cartItems,
      input.cart_items,
      input.products,
      input.orderItem,
      input.lineItem,
      input.line_item,
      input.lineItems,
      input.line_items,
      input.snapshot,
      input.orderSnapshot,
      input.order_snapshot,
      input.data,
      input.payload,
      input.result,
      input.node,
      input.meta,
      input.raw,
      input.productData,
      input.product_data,
      input.productDetails,
      input.product_details,
    ];

    for (const value of nested) {
      const picked = pickFirstImageCandidate(value, depth + 1, tracked);
      if (picked) return picked;
    }
  }

  return '';
}

export function getProductImageCandidates(product: any): string[] {
  if (!product) return [];

  const resolved: string[] = [];

  const pushCandidate = (candidate: any) => {
    const picked = pickFirstImageCandidate(candidate);
    if (!picked) return;

    const absolute = toAbsoluteAssetUrl(picked);
    if (!absolute || !isProbablyValidImageUrl(absolute) || resolved.includes(absolute)) return;

    resolved.push(absolute);
  };

  const candidates = [
    product?.thumbnail?.url,
    product?.thumbnail?.uri,
    product?.thumbnail?.src,
    product?.thumbnail?.path,
    product?.thumbnail,
    product?.thumbnailImage,
    product?.thumbnail_image,
    product?.thumbnailUrl,
    product?.thumbnail_url,
    product?.thumb,
    product?.thumbUrl,
    product?.thumb_url,
    product?.product?.thumbnail,
    product?.product?.image,
    product?.product?.images,
    product?.product?.media,
    product?.product?.gallery,
    product?.product?.assets,
    product?.product?.variants,
    product?.product?.variantSnapshot,
    product?.product?.productSnapshot,
    product?.item?.thumbnail,
    product?.item?.image,
    product?.item?.images,
    product?.item?.assets,
    product?.item?.variants,
    product?.item?.variantSnapshot,
    product?.item?.productSnapshot,
    product?.orderItem?.thumbnail,
    product?.orderItem?.image,
    product?.orderItem?.images,
    product?.orderItem?.assets,
    product?.orderItem?.variants,
    product?.orderItem?.variantSnapshot,
    product?.orderItem?.productSnapshot,
    product?.coverImage,
    product?.cover_image,
    product?.heroImage,
    product?.hero_image,
    product?.image,
    product?.imageUri,
    product?.imagePath,
    product?.image_path,
    product?.imageUrl,
    product?.imageURL,
    product?.image_url,
    product?.productImage,
    product?.product_image,
    product?.variantImage,
    product?.variant_image,
    product?.displayImage,
    product?.display_image,
    product?.primaryImage,
    product?.primary_image,
    product?.defaultImage,
    product?.default_image,
    product?.featuredImage,
    product?.featured_image,
    product?.mainImage,
    product?.main_image,
    product?.poster,
    product?.banner,
    product?.preview,
    product?.previewImage,
    product?.preview_image,
    product?.fileUrl,
    product?.file_url,
    product?.asset,
    product?.assetUrl,
    product?.asset_url,
    product?.photo,
    product?.picture,
    product?.img,
    product?.images,
    product?.assets,
    product?.imageCandidates,
    product?.media,
    product?.gallery,
    product?.files,
    product?.attachments,
    product?.variants,
    product?.variant,
    product?.variantSnapshot,
    product?.variant_snapshot,
    product?.selectedVariant,
    product?.selected_variant,
    product?.defaultVariant,
    product?.default_variant,
    product?.option,
    product?.options,
    product?.product,
    product?.productRef,
    product?.product_ref,
    product?.productSnapshot,
    product?.product_snapshot,
    product?.snapshot,
    product?.orderSnapshot,
    product?.order_snapshot,
    product?.item,
    product?.itemSnapshot,
    product?.item_snapshot,
    product?.items,
    product?.orderItems,
    product?.order_items,
    product?.cartItems,
    product?.cart_items,
    product?.products,
    product?.orderItem,
    product?.lineItem,
    product?.line_item,
    product?.lineItems,
    product?.line_items,
    product?.data,
    product?.payload,
    product?.result,
    product?.meta,
    product?.raw,
    product?.productData,
    product?.product_data,
    product?.productDetails,
    product?.product_details,
  ];

  for (const candidate of candidates) {
    pushCandidate(candidate);
  }

  return resolved;
}

export function mergeProductImageCandidates(...sources: any[]): string[] {
  const merged: string[] = [];

  for (const source of sources) {
    const candidates = getProductImageCandidates(source);
    for (const candidate of candidates) {
      if (!candidate || merged.includes(candidate)) continue;
      merged.push(candidate);
    }
  }

  return merged;
}

export function resolveProductImageSource(...sources: any[]): { imageUri: string; imageCandidates: string[]; imageKey: string } {
  const imageCandidates = mergeProductImageCandidates(...sources);
  return {
    imageUri: imageCandidates[0] || '',
    imageCandidates,
    imageKey: imageCandidates.join('|'),
  };
}

export function getProductImageUrl(product: any): string {
  return getProductImageCandidates(product)[0] || '';
}

export function inferFlowTypeFromItemId(id?: string): 'printing' | 'gifting' | 'shopping' {
  const raw = String(id || '').toLowerCase();
  if (raw.startsWith('gift-') || raw.includes('gifting')) return 'gifting';
  if (raw.startsWith('print-') || raw.includes('printing')) return 'printing';
  return 'shopping';
}

type ProductLike = {
  _id?: string;
  id?: string;
  slug?: string;
  sku?: string;
  name?: string;
  sortOrder?: number;
  createdAt?: string;
};

function getProductIdentity(item: ProductLike): string {
  const id = String(item._id || item.id || '').trim();
  if (id) return `id:${id}`;

  const slug = String(item.slug || '').trim().toLowerCase();
  if (slug) return `slug:${slug}`;

  const sku = String(item.sku || '').trim().toLowerCase();
  if (sku) return `sku:${sku}`;

  const name = String(item.name || '').trim().toLowerCase();
  return name ? `name:${name}` : '';
}

export function dedupeProducts<T extends ProductLike>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items || []) {
    const key = getProductIdentity(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export function sortProducts<T extends ProductLike>(items: T[]): T[] {
  return [...(items || [])].sort((a, b) => {
    const aSort = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const bSort = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (aSort !== bSort) return aSort - bSort;

    const aCreated = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bCreated = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (aCreated !== bCreated) return bCreated - aCreated;

    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export function takeUniqueById<T extends { id?: string }>(
  items: T[],
  usedIds: Set<string>,
  limit?: number,
): T[] {
  const picked: T[] = [];

  for (const item of items || []) {
    const id = String(item?.id || '').trim();
    if (!id || usedIds.has(id)) continue;
    usedIds.add(id);
    picked.push(item);
    if (limit && picked.length >= limit) break;
  }

  return picked;
}
