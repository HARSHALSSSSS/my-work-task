import api, { API_BASE_URL, getToken } from './client';
import { isLikelyMongoId } from '../utils/product';

type Res<T> = { success: boolean; data: T; message?: string };
type QueryParams = Record<string, any> | undefined;

const CACHE_TTL_MS = 20000;
const responseCache = new Map<string, { value: unknown; expiresAt: number }>();
const inflightRequests = new Map<string, Promise<unknown>>();

function stableSerialize(params?: QueryParams): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}:${String(v)}`).join('|');
}

function cacheKey(path: string, params?: QueryParams): string {
  const serialized = stableSerialize(params);
  return serialized ? `${path}?${serialized}` : path;
}

async function cachedGet<T>(path: string, params?: QueryParams, ttlMs = CACHE_TTL_MS): Promise<T> {
  const key = cacheKey(path, params);
  const now = Date.now();
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }
  const pending = inflightRequests.get(key);
  if (pending) return pending as Promise<T>;

  const request = (async () => {
    try {
      const { data } = await api.get<Res<T>>(path, params ? { params } : undefined);
      responseCache.set(key, { value: data.data, expiresAt: Date.now() + ttlMs });
      return data.data;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, request as Promise<unknown>);
  return request;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  flowType: 'printing' | 'gifting' | 'shopping';
  section?: string;
  image?: string;
  starting_from?: number;
  isActive: boolean;
  sortOrder?: number;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  category: string;
  flowType: string;
  image?: string;
}

export interface ProductItem {
  _id: string;
  name: string;
  slug: string;
  flowType: 'printing' | 'gifting' | 'shopping';
  category?: Category | string;
  subcategory?: Subcategory | string;
  basePrice: number;
  discountedPrice?: number;
  mrp?: number;
  sale_price?: number;
  bulk_price?: number;
  images: string[];
  thumbnail?: string;
  description?: string;
  badge?: string;
  sku?: string;
  brand?: string;
  tags?: string[];
  highlights?: string[];
  specs?: Record<string, string>;
  deal?: { type?: string; label?: string; starts_at?: string; ends_at?: string };
  discount_pct?: number;
  isActive: boolean;
  isFeatured: boolean;
  stock?: number;
  variants?: any[];
  printOptions?: any;
  giftOptions?: any;
  requiresDesign?: boolean;
  requiresUpload?: boolean;
  sortOrder?: number;
}

// ─── Upload helpers ──────────────────────────────────

function inferMimeType(input?: { name?: string; uri?: string; mimeType?: string }): string {
  const provided = String(input?.mimeType || '').trim().toLowerCase();
  if (provided && provided.includes('/') && !provided.includes('octet')) return provided;

  const source = `${input?.name || ''} ${input?.uri || ''}`.toLowerCase();
  if (source.includes('.pdf'))  return 'application/pdf';
  if (source.includes('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (source.includes('.doc'))  return 'application/msword';
  if (source.includes('.png'))  return 'image/png';
  if (source.includes('.jpg') || source.includes('.jpeg')) return 'image/jpeg';
  if (source.includes('.gif'))  return 'image/gif';
  if (source.includes('.txt'))  return 'text/plain';
  if (source.includes('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (source.includes('.xls'))  return 'application/vnd.ms-excel';
  if (source.includes('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (source.includes('.ppt'))  return 'application/vnd.ms-powerpoint';
  return 'application/pdf';
}

export interface UploadedFile {
  _id?: string;
  url: string;
  name: string;
  mimeType?: string;
  size?: number;
  pageCount?: number;
  previewImage?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
}

const UPLOAD_TIMEOUT_MS = 60000;

const UPLOAD_TARGETS = [
  '/api/printing/upload',
];

// ─── DEBUG UPLOAD ────────────────────────────────────
// TEMPORARY: Call this instead of uploadPrintingFile to see what is happening.
// Run in terminal:  adb logcat | findstr ReactNativeJS
// Then trigger the upload in the app and paste the logs here.
export async function debugUploadPrintingFile(
  file: { uri: string; name: string; mimeType?: string },
): Promise<void> {
  console.log('=== DEBUG UPLOAD START ===');
  console.log('file.uri    :', file.uri);
  console.log('file.name   :', file.name);
  console.log('file.mimeType:', file.mimeType);
  console.log('API_BASE_URL :', API_BASE_URL);

  const token = await getToken();
  console.log('token exists :', !!token);

  const mimeType = inferMimeType(file);
  console.log('resolved mime:', mimeType);

  const safeName = (file.name || 'upload.pdf').replace(/[^\w.\-]/g, '_');
  console.log('safe name    :', safeName);

  const formData = new FormData();
  formData.append('files', {
    uri: file.uri,
    name: safeName,
    type: mimeType,
  } as any);

  const url = `${API_BASE_URL}/api/printing/upload`;
  console.log('uploading to :', url);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.onreadystatechange = () => {
      console.log(`readyState: ${xhr.readyState}  status: ${xhr.status}`);
    };

    xhr.onload = () => {
      console.log('=== UPLOAD RESPONSE ===');
      console.log('status  :', xhr.status);
      console.log('response:', xhr.responseText?.slice(0, 500));
      resolve();
    };

    xhr.onerror = () => {
      console.log('=== XHR onerror ===');
      console.log('status  :', xhr.status);
      console.log('response:', xhr.responseText?.slice(0, 500));
      reject(new Error('XHR network error'));
    };

    xhr.ontimeout = () => {
      console.log('=== XHR TIMED OUT ===');
      reject(new Error('XHR timeout'));
    };

    // This is the most important log — shows how many bytes actually got sent
    xhr.upload.onprogress = (e) => {
      console.log(`upload progress: ${e.loaded} bytes sent / ${e.total} total`);
    };

    xhr.upload.onload = () => {
      console.log('upload.onload fired — all bytes sent to server');
    };

    xhr.upload.onerror = () => {
      console.log('upload.onerror fired — failed while sending bytes');
    };

    xhr.send(formData);
    console.log('xhr.send() called');
  });
}

// ─── REAL UPLOAD (unchanged, uses XHR) ──────────────
function xhrUpload(
  url: string,
  formData: FormData,
  token: string | null,
  timeoutMs: number,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = timeoutMs;
    console.log('[upload] start', { url, timeoutMs, hasToken: Boolean(token) });

    xhr.onload = () => {
      let parsed: any = {};
      try { parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch { /* noop */ }
      console.log('[upload] response', {
        status: xhr.status,
        length: xhr.responseText?.length,
        body: xhr.responseText?.slice(0, 500),
      });
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed);
      } else {
        const msg = parsed?.message || `Upload failed (${xhr.status})`;
        const err: any = new Error(msg);
        err.status = xhr.status;
        err.serverMessage = msg;
        reject(err);
      }
    };

    xhr.onerror = () => {
      console.log('[upload] xhr error', { status: xhr.status, readyState: xhr.readyState });
      reject(new Error('Network error during upload. Please check your connection.'));
    };
    xhr.ontimeout = () => {
      const err: any = new Error('Upload timed out. Please try again on a better connection.');
      err.isTimeout = true;
      reject(err);
    };

    xhr.send(formData);
  });
}

export async function uploadPrintingFile(
  file: { uri: string; name: string; mimeType?: string },
): Promise<UploadedFile> {
  const token = await getToken();
  const mimeType = inferMimeType(file);

  const safeName = (file.name || 'upload')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_');

  let data: any = null;
  let lastError: any = null;

  for (const path of UPLOAD_TARGETS) {
    const url = `${API_BASE_URL}${path}`;
    try {
      const formData = new FormData();
      formData.append('files', {
        uri: file.uri,
        name: safeName,
        type: mimeType,
      } as any);

      data = await xhrUpload(url, formData, token, UPLOAD_TIMEOUT_MS);
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      if (err?.status === 401 || err?.status === 403) break;
    }
  }

  if (lastError) throw lastError;

  const payload = data?.data;
  const first =
    payload?.files?.[0] ??
    payload?.file ??
    (Array.isArray(payload) ? payload[0] : null) ??
    (Array.isArray(data?.files) ? data.files[0] : null) ??
    payload;

  if (!first || typeof first !== 'object') {
    throw new Error('Upload succeeded but server returned no file metadata.');
  }

  return {
    _id:       first._id || first.id || first.publicId || undefined,
    url:       first.url || first.fileUrl || first.path || '',
    name:      first.name || first.originalName || first.filename || safeName,
    mimeType:  first.mimeType || first.mimetype || mimeType,
    size:      first.size || first.fileSize,
    pageCount: first.pageCount || first.pages || undefined,
    previewImage:
      first.previewImage
      || first.preview_image
      || first.thumbnail
      || first.thumbnailUrl
      || first.thumbnail_url
      || first.firstPageImage
      || first.first_page_image
      || undefined,
    thumbnailUrl:
      first.thumbnailUrl
      || first.thumbnail_url
      || first.thumbnail
      || first.previewImage
      || first.preview_image
      || undefined,
    previewUrl:
      first.previewUrl
      || first.preview_url
      || first.viewerUrl
      || first.viewer_url
      || undefined,
  };
}

// ─── Printing ───────────────────────────────────────
export async function getPrintingHome() {
  return cachedGet<any>('/api/printing/home');
}

export async function getDocumentTypes() {
  return cachedGet<any[]>('/api/printing/document-types');
}

export async function getServicePackages() {
  return cachedGet<any[]>('/api/printing/service-packages');
}

export async function getPickupLocations(params?: { lat?: number; lng?: number; pincode?: string }) {
  return cachedGet<any[]>('/api/printing/pickup-locations', params);
}

export async function savePrintConfig(body: any) {
  const { data } = await api.post<Res<any>>('/api/products/printing/configure', body);
  return data.data;
}

export async function getPrintConfig(id: string) {
  return cachedGet<any>(`/api/products/printing/config/${id}`);
}

// ─── Business Printing ──────────────────────────────
export async function getBusinessPrintingHome() {
  return cachedGet<any>('/api/business-printing/home');
}

export async function getBusinessPrintTypes() {
  return cachedGet<any[]>('/api/business-printing/types');
}

export async function getBusinessPrintProducts(params?: { type?: string; page?: number; limit?: number }) {
  return cachedGet<any>('/api/business-printing/products', params);
}

export async function getBusinessPrintProduct(id: string) {
  return cachedGet<any>(`/api/business-printing/products/${id}`);
}

export interface SaveBusinessPrintConfigBody {
  productId: string;
  productName: string;
  businessPrintType: string;
  designType: 'premium' | 'normal';
  designId: string;
  previewImage?: string;
  selectedOptions?: {
    size?: string;
    paperType?: string;
    finish?: string;
    sides?: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryMethod: 'pickup' | 'delivery';
  shopId?: string;
  servicePackage?: 'standard' | 'express' | 'instant' | '';
  readyToPrintFile?: UploadedFile | null;
}

export async function saveBusinessPrintConfig(body: SaveBusinessPrintConfigBody) {
  const { data } = await api.post<Res<any>>('/api/business-printing/configure', body);
  return data.data;
}

// ─── Gifting ────────────────────────────────────────
export async function getGiftingHome() {
  return cachedGet<any>('/api/gifting/home');
}

export async function getGiftingCategories() {
  return cachedGet<Category[]>('/api/gifting/categories');
}

export async function getGiftingProducts(params?: { category?: string; page?: number; limit?: number }) {
  return cachedGet<any>('/api/gifting/products', params);
}

export async function getGiftingProduct(identifier: string) {
  return cachedGet<ProductItem>(`/api/gifting/products/${identifier}`);
}

export async function searchGifting(params: { q: string; category?: string }) {
  return cachedGet<ProductItem[]>('/api/gifting/search', params, 5000);
}

// ─── Shopping ───────────────────────────────────────
export async function getShoppingHome() {
  return cachedGet<any>('/api/shop/home');
}

export async function getShoppingCategories() {
  return cachedGet<Category[]>('/api/shop/categories');
}

export async function getShoppingProducts(params?: { category?: string; page?: number; limit?: number }) {
  return cachedGet<any>('/api/shop/products', params);
}

export async function getShoppingProduct(identifier: string) {
  const trimmed = String(identifier || '').trim();
  if (isLikelyMongoId(trimmed)) {
    return cachedGet<ProductItem>(`/api/products/${trimmed}`);
  }
  return cachedGet<ProductItem>(`/api/shop/products/${trimmed}`);
}

export async function searchShopping(params: { q: string; category?: string; page?: number; limit?: number }) {
  return cachedGet<ProductItem[]>('/api/shop/search', params, 5000);
}

export async function getShoppingDeals() {
  return cachedGet<ProductItem[]>('/api/shop/deals');
}

// ─── Banners ────────────────────────────────────────
export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  image?: string;
  bg_color?: string;
  placement?: string;
  section?: string;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
}

export async function getBanners(section?: string): Promise<Banner[]> {
  void section;
  return [];
}

// ─── Categories (general) ───────────────────────────
export async function getCategories(flowType?: string) {
  return cachedGet<Category[]>('/api/products/categories', flowType ? { flowType } : undefined);
}

// ─── Generic products ───────────────────────────────
export async function getProducts(params?: {
  category?: string;
  flowType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return cachedGet<{
    products: ProductItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>('/api/products', params);
}

export async function getProductById(id: string) {
  return cachedGet<ProductItem>(`/api/products/${id}`, undefined, 15000);
}
