import { API_BASE_URL } from '../api/client';

export function isLikelyMongoId(value?: string | null): boolean {
  return /^[a-fA-F0-9]{24}$/.test(String(value || ''));
}

export function toAbsoluteAssetUrl(url?: string | null): string {
  let raw = String(url || '').trim();
  if (!raw) return '';

  // For relative paths, ensure /uploads/ prefix for gateway routing
  if (!raw.startsWith('http') && !raw.startsWith('file:') && !raw.startsWith('content:') && !raw.startsWith('data:') && !raw.startsWith('//')) {
    if (!raw.startsWith('/uploads')) {
      raw = raw.startsWith('/') ? `/uploads${raw}` : `/uploads/${raw}`;
    }
  }

  if (/^(https?:|file:|content:|data:)/i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const apiBase = new URL(API_BASE_URL);
      const isLocalHost =
        parsed.hostname === 'localhost'
        || parsed.hostname === '127.0.0.1'
        || parsed.hostname === '0.0.0.0';
      const isPrivateIpv4 =
        /^10\./.test(parsed.hostname)
        || /^192\.168\./.test(parsed.hostname)
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(parsed.hostname);
      const uploadsPath = parsed.pathname.includes('/uploads/')
        ? parsed.pathname.slice(parsed.pathname.indexOf('/uploads/'))
        : '';
      const shouldRewriteToGateway =
        uploadsPath
        && (
          isLocalHost
          || isPrivateIpv4
          || parsed.origin !== apiBase.origin
        );

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

function pickFirstImageCandidate(input: any): string {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (Array.isArray(input)) {
    for (const entry of input) {
      const picked = pickFirstImageCandidate(entry);
      if (picked) return picked;
    }
    return '';
  }
  if (typeof input === 'object') {
    const direct = [
      input.url,
      input.uri,
      input.src,
      input.image,
      input.path,
      input.secure_url,
      input.original,
      input.optimized,
    ];
    for (const value of direct) {
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return '';
}

export function getProductImageUrl(product: any): string {
  if (!product) return '';
  const candidates = [
    product?.product?.thumbnail,
    product?.product?.image,
    product?.product?.images,
    product?.thumbnailUrl,
    product?.thumb,
    product.thumbnail,
    product.image,
    product.imageUrl,
    product.imageURL,
    product.image_url,
    product.featuredImage,
    product.featured_image,
    product.mainImage,
    product.main_image,
    product.poster,
    product.banner,
    product.images,
    product.media,
    product.gallery,
    product.files,
    product.product,
  ];
  for (const candidate of candidates) {
    const picked = pickFirstImageCandidate(candidate);
    if (picked) return toAbsoluteAssetUrl(picked);
  }
  return '';
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
