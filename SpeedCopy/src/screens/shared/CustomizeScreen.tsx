import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  InteractionManager,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  ImagePlus,
  Package,
  RotateCcw,
  ShoppingCart,
  Upload,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Spacing } from '../../constants/theme';
import { useCartStore } from '../../store/useCartStore';
import { useThemeStore } from '../../store/useThemeStore';
import { QuantityPicker } from '../../components/ui/QuantityPicker';
import {
  SkiaProductCanvas,
  ProductCanvasConfig,
  ProductMaskKind,
  ProductMaskSpec,
  SkiaProductCanvasHandle,
} from '../../components/canvas/SkiaProductCanvas';
import * as productsApi from '../../api/products';
import * as designsApi from '../../api/designs';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { getProductImageUrl, isLikelyMongoId, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { getLiveStockState, LiveStockState } from '../../utils/stock';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const FALLBACK_IMAGES: Record<string, any> = {
  gifting: require('../../../assets/images/gift-prod-mug.png'),
  printing: require('../../../assets/images/print-business-cards.png'),
  shopping: require('../../../assets/images/shop-notebooks.png'),
};

// Print-area presets per product type.
// Values are 0-1 fractions of the fitted product image (the same box
// React Native uses for `resizeMode="contain"` on the mockup), not the raw
// canvas. SkiaProductCanvas maps these onto the screen using `productNaturalSize`.
type ProductKind =
  | 'mug'
  | 'tshirt'
  | 'card'
  | 'businessCard'
  | 'invitationCard'
  | 'photoPrint'
  | 'flyer'
  | 'notebook'
  | 'diary'
  | 'frame'
  | 'pen'
  | 'pencil'
  | 'bottle'
  | 'cap'
  | 'bag'
  | 'phonecase'
  | 'poster'
  | 'sticker'
  | 'clock'
  | 'plate'
  | 'organizer'
  | 'generic';

/**
 * Auto-fit mode:
 * - Image auto-fits (cover) inside the configured print area.
 * - Print area is product-specific (mug band, clock face, cover panel, etc.).
 * - Backend can still override printArea/mask/overlay per product.
 */
const PRODUCT_CANVAS_CONFIGS: Record<ProductKind, ProductCanvasConfig> = {
  mug: {
    // Front visible ceramic band only (keeps handle + rim outside print).
    // Expanded more towards left side; right side stays tighter to avoid handle overlap.
    printArea: { left: 0.10, top: 0.27, right: 0.69, bottom: 0.86, label: 'Mug Wrap' },
    // Mug needs a different top arc profile than generic barrel products.
    mask: {
      kind: 'barrel',
      curvature: 0.82,
      edgeInset: 0.88,
      topCurve: 0.34,
      bottomCurve: 0.08,
    },
  },
  bottle: {
    printArea: { left: 0.26, top: 0.18, right: 0.74, bottom: 0.86, label: 'Bottle Wrap' },
    mask: { kind: 'barrel', curvature: 0.75 },
  },
  pen: {
    // Current pen mockup is diagonal. Keep a tight center band.
    printArea: { left: 0.30, top: 0.34, right: 0.80, bottom: 0.68, label: 'Pen Body' },
    mask: { kind: 'barrel', curvature: 0.48 },
  },
  pencil: {
    printArea: { left: 0.29, top: 0.36, right: 0.83, bottom: 0.66, label: 'Pencil Body' },
    mask: { kind: 'barrel', curvature: 0.42 },
  },
  tshirt: {
    printArea: { left: 0.26, top: 0.22, right: 0.74, bottom: 0.62, label: 'Front Print' },
    mask: { kind: 'roundedRect', cornerRadius: 8 },
  },
  bag: {
    printArea: { left: 0.18, top: 0.22, right: 0.82, bottom: 0.74, label: 'Print Area' },
    mask: { kind: 'roundedRect', cornerRadius: 8 },
  },
  cap: {
    printArea: { left: 0.26, top: 0.30, right: 0.74, bottom: 0.56, label: 'Front Patch' },
    mask: { kind: 'barrel', curvature: 0.45 },
  },
  phonecase: {
    printArea: { left: 0.16, top: 0.08, right: 0.84, bottom: 0.92, label: 'Case Back' },
    mask: { kind: 'roundedRect', cornerRadius: 16 },
  },
  card: {
    printArea: { left: 0.10, top: 0.12, right: 0.90, bottom: 0.88, label: 'Card Face' },
    mask: { kind: 'rect' },
  },
  businessCard: {
    // Foreground card in print-business-cards.png
    printArea: { left: 0.46, top: 0.27, right: 0.94, bottom: 0.86, label: 'Business Card Face' },
    mask: { kind: 'roundedRect', cornerRadius: 10 },
  },
  invitationCard: {
    // Front invitation card in print-invitation-cards.png
    printArea: { left: 0.39, top: 0.06, right: 0.90, bottom: 0.88, label: 'Invitation Front' },
    mask: { kind: 'roundedRect', cornerRadius: 8 },
  },
  photoPrint: {
    // Main front print in print-photo-prints.png
    printArea: { left: 0.20, top: 0.26, right: 0.79, bottom: 0.63, label: 'Photo Print' },
    mask: { kind: 'rect' },
  },
  flyer: {
    // Center brochure panel in print-flyers-brochures.png
    printArea: { left: 0.36, top: 0.15, right: 0.67, bottom: 0.92, label: 'Front Flyer' },
    mask: { kind: 'roundedRect', cornerRadius: 10 },
  },
  notebook: {
    // Spiral notebook cover area (exclude left ring-hole strip).
    printArea: { left: 0.33, top: 0.18, right: 0.80, bottom: 0.86, label: 'Notebook Cover' },
    mask: { kind: 'roundedRect', cornerRadius: 16 },
  },
  diary: {
    // Diary front face while avoiding stitched edge and side strap.
    // Keep right side narrower so strap/button region is not part of print.
    printArea: { left: 0.23, top: 0.14, right: 0.71, bottom: 0.85, label: 'Diary Cover' },
    mask: { kind: 'roundedRect', cornerRadius: 12 },
  },
  frame: {
    // Inner opening of wood frame only.
    printArea: { left: 0.24, top: 0.25, right: 0.76, bottom: 0.81, label: 'Photo Area' },
    mask: { kind: 'rect' },
  },
  organizer: {
    // Paper note zone in the wooden organizer mockup.
    printArea: { left: 0.36, top: 0.57, right: 0.85, bottom: 0.93, label: 'Note Area' },
    mask: { kind: 'rect' },
  },
  poster: {
    printArea: { left: 0.04, top: 0.04, right: 0.96, bottom: 0.96, label: 'Print Area' },
    mask: { kind: 'rect' },
  },
  sticker: {
    printArea: { left: 0.08, top: 0.08, right: 0.92, bottom: 0.92, label: 'Sticker' },
    mask: { kind: 'roundedRect', cornerRadius: 14 },
  },
  clock: {
    printArea: { left: 0.14, top: 0.14, right: 0.86, bottom: 0.86, label: 'Clock Face' },
    mask: { kind: 'circle' },
  },
  plate: {
    printArea: { left: 0.16, top: 0.16, right: 0.84, bottom: 0.84, label: 'Plate Face' },
    mask: { kind: 'circle' },
  },
  generic: {
    printArea: { left: 0.12, top: 0.16, right: 0.88, bottom: 0.84, label: 'Print Area' },
    mask: { kind: 'roundedRect', cornerRadius: 8 },
  },
};

function detectProductKind(name: string, flow: string): ProductKind {
  const n = (name || '').toLowerCase();
  if (/\b(mug|cup|tumbler)\b/.test(n)) return 'mug';
  if (/\b(clock|wall\s*clock|watch|dial)\b/.test(n)) return 'clock';
  if (/\b(plate|coaster|disc)\b/.test(n)) return 'plate';
  if (/\b(pen|roller\s*pen|ball\s*pen)\b/.test(n)) return 'pen';
  if (/\bpencil\b/.test(n)) return 'pencil';
  if (/\b(t[\s-]?shirt|tee|hoodie|sweat|polo)\b/.test(n)) return 'tshirt';
  if (/\bbusiness[\s-]*cards?\b|\bprint[-_ ]business[-_ ]cards\b/.test(n)) return 'businessCard';
  if (/\binvitation[\s-]*cards?\b|\bwedding[\s-]*cards?\b|\bprint[-_ ]invitation[-_ ]cards\b/.test(n)) return 'invitationCard';
  if (/\bphoto[\s-]*prints?\b|\bprint[-_ ]photo[-_ ]prints\b/.test(n)) return 'photoPrint';
  if (/\bflyers?\b|\bbrochures?\b|\bprint[-_ ]flyers[-_ ]brochures\b/.test(n)) return 'flyer';
  if (/\b(visiting|business)?\s*card\b/.test(n)) return 'card';
  if (/\b(diary|journal|planner)\b/.test(n)) return 'diary';
  if (/\b(notebook|note\s*book|shop[-_ ]notebooks)\b/.test(n)) return 'notebook';
  if (/\borganizer|desk\s*organizer|shop[-_ ]organizer\b/.test(n)) return 'organizer';
  if (/\b(photo\s*frame|photoframe|frame|wall\s*frame)\b/.test(n)) return 'frame';
  if (/\b(bottle|flask|sipper)\b/.test(n)) return 'bottle';
  if (/\b(cap|hat)\b/.test(n)) return 'cap';
  if (/\b(bag|tote|backpack|pouch)\b/.test(n)) return 'bag';
  if (/\b(case|cover)\b/.test(n) && /\b(phone|mobile|iphone|samsung)\b/.test(n)) return 'phonecase';
  if (/\b(poster|banner|flyer|brochure|leaflet)\b/.test(n)) return 'poster';
  if (/\bsticker\b/.test(n)) return 'sticker';
  // Flow-based defaults
  if (flow === 'printing') return 'businessCard';
  if (flow === 'gifting') return 'mug';
  if (flow === 'shopping') return 'notebook';
  return 'generic';
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseMaskKind(value: unknown): ProductMaskKind | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.toLowerCase();
  if (v === 'rect' || v === 'rectangle') return 'rect';
  if (v === 'rounded' || v === 'roundedrect' || v === 'rounded_rect') return 'roundedRect';
  if (v === 'circle' || v === 'oval') return 'circle';
  if (v === 'barrel' || v === 'mugcurve' || v === 'curve') return 'barrel';
  if (v === 'svg' || v === 'custom') return 'svg';
  return undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function entityName(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (isRecord(value)) return firstString(value.name, value.slug, value.title);
  return undefined;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clampRange = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const MIN_PRINT_AREA_SIZE = 0.1;
const AREA_DRAG_GAIN = 1.6;
const CURVE_DRAG_GAIN = 1.65;
const TEXT_DRAG_GAIN = 1.55;

type CornerHandle = 'tl' | 'tr' | 'bl' | 'br';
type BarrelHandle = 'topArc' | 'bottomArc' | 'depth';

type TextLayer = {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
};

const TEXT_COLORS = ['#111111', '#0F172A', '#1D4ED8', '#047857', '#B91C1C', '#7C3AED', '#FFFFFF'];

function fitContainRect(
  cw: number,
  ch: number,
  iw?: number,
  ih?: number,
): { x: number; y: number; w: number; h: number } {
  if (!iw || !ih || !cw || !ch) return { x: 0, y: 0, w: cw, h: ch };
  const s = Math.min(cw / iw, ch / ih);
  const w = iw * s;
  const h = ih * s;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

function forcedMaskKindForProduct(kind: ProductKind): ProductMaskKind | null {
  if (kind === 'mug' || kind === 'bottle' || kind === 'pen' || kind === 'pencil' || kind === 'cap') {
    return 'barrel';
  }
  if (kind === 'clock' || kind === 'plate') {
    return 'circle';
  }
  return null;
}

function sanitizePrintArea(
  area: ProductCanvasConfig['printArea'],
  fallback: ProductCanvasConfig['printArea'],
  maskKind: ProductMaskKind,
): ProductCanvasConfig['printArea'] {
  const left = clamp01(area.left);
  const top = clamp01(area.top);
  const right = clamp01(area.right);
  const bottom = clamp01(area.bottom);

  const width = right - left;
  const height = bottom - top;
  const nearFull = width >= 0.96 && height >= 0.96;
  const tooTiny = width < 0.08 || height < 0.08;

  // Protect shaped products from accidental "full product body" overrides.
  if ((maskKind === 'barrel' || maskKind === 'circle') && nearFull) {
    return fallback;
  }
  if (tooTiny || right <= left || bottom <= top) {
    return fallback;
  }

  return {
    left,
    top,
    right,
    bottom,
    label: area.label || fallback.label,
  };
}

function sanitizeEditablePrintArea(
  area: ProductCanvasConfig['printArea'],
  fallback: ProductCanvasConfig['printArea'],
): ProductCanvasConfig['printArea'] {
  let left = clamp01(area.left);
  let top = clamp01(area.top);
  let right = clamp01(area.right);
  let bottom = clamp01(area.bottom);

  // Keep a minimum editable box size, but never snap to fallback while editing.
  if (right - left < MIN_PRINT_AREA_SIZE) {
    right = Math.min(1, left + MIN_PRINT_AREA_SIZE);
    left = Math.max(0, right - MIN_PRINT_AREA_SIZE);
  }
  if (bottom - top < MIN_PRINT_AREA_SIZE) {
    bottom = Math.min(1, top + MIN_PRINT_AREA_SIZE);
    top = Math.max(0, bottom - MIN_PRINT_AREA_SIZE);
  }

  // Final validity guard.
  if (right <= left) {
    right = Math.min(1, left + MIN_PRINT_AREA_SIZE);
    left = Math.max(0, right - MIN_PRINT_AREA_SIZE);
  }
  if (bottom <= top) {
    bottom = Math.min(1, top + MIN_PRINT_AREA_SIZE);
    top = Math.max(0, bottom - MIN_PRINT_AREA_SIZE);
  }

  return {
    left,
    top,
    right,
    bottom,
    label: area.label || fallback.label,
  };
}

function applyCanvasOverride(
  kind: ProductKind,
  base: ProductCanvasConfig,
  override?: Partial<ProductCanvasConfig> | null,
): ProductCanvasConfig {
  if (!override) return base;

  const mergedMask: ProductCanvasConfig['mask'] = {
    ...base.mask,
    ...(override.mask ?? {}),
  };
  const forcedMask = forcedMaskKindForProduct(kind);
  if (forcedMask) {
    mergedMask.kind = forcedMask;
  }

  const mergedArea = {
    ...base.printArea,
    ...(override.printArea ?? {}),
  };

  return {
    printArea: sanitizePrintArea(mergedArea, base.printArea, mergedMask.kind),
    mask: mergedMask,
    overlay: override.overlay
      ? { ...(base.overlay ?? {}), ...override.overlay }
      : base.overlay,
  };
}

function extractCanvasOverrideFromProduct(
  product?: productsApi.ProductItem,
): Partial<ProductCanvasConfig> | null {
  if (!product) return null;

  // Flat backend fields (preferred shape from admin panel):
  //   print_area_left / print_area_top / print_area_right / print_area_bottom
  // If all four are present we treat them as the single source of truth and
  // skip the richer nested-bucket extraction below.
  const flat = product as unknown as Record<string, any>;
  const flatLeft = firstNumber(flat.print_area_left, flat.printAreaLeft);
  const flatTop = firstNumber(flat.print_area_top, flat.printAreaTop);
  const flatRight = firstNumber(flat.print_area_right, flat.printAreaRight);
  const flatBottom = firstNumber(flat.print_area_bottom, flat.printAreaBottom);
  if (
    flatLeft != null &&
    flatTop != null &&
    flatRight != null &&
    flatBottom != null
  ) {
    return {
      printArea: {
        left: flatLeft,
        top: flatTop,
        right: flatRight,
        bottom: flatBottom,
        label: firstString(flat.print_area_label, flat.printAreaLabel),
      },
    };
  }

  const optionRoots = [product.printOptions, product.giftOptions]
    .filter(isRecord);
  const buckets = optionRoots.flatMap((root) => {
    const nested = [
      root,
      root.customization,
      root.canvas,
      root.design,
      root.editor,
    ].filter(isRecord);
    return nested;
  });

  if (buckets.length === 0) return null;

  const areaNode = buckets
    .map((b) => (isRecord(b.printArea) ? b.printArea : isRecord(b.print_area) ? b.print_area : null))
    .find(Boolean) as Record<string, any> | undefined;

  const maskNode = buckets
    .map((b) => (isRecord(b.mask) ? b.mask : null))
    .find(Boolean);

  const overlayNode = buckets
    .map((b) => b.overlay ?? b.overlayImage ?? b.overlay_image ?? b.templateOverlay ?? b.template_overlay)
    .find(Boolean);

  const override: Partial<ProductCanvasConfig> = {};

  if (areaNode) {
    const left = firstNumber(areaNode.left, areaNode.x, areaNode.startX);
    const top = firstNumber(areaNode.top, areaNode.y, areaNode.startY);
    const right = firstNumber(areaNode.right, areaNode.endX);
    const bottom = firstNumber(areaNode.bottom, areaNode.endY);
    override.printArea = {
      left: left ?? 0.12,
      top: top ?? 0.16,
      right: right ?? 0.88,
      bottom: bottom ?? 0.84,
      label: firstString(areaNode.label, areaNode.name),
    };
  }

  if (maskNode || buckets[0]?.maskType) {
    const node = isRecord(maskNode) ? maskNode : {};
    const kind = parseMaskKind(node.kind ?? node.type ?? buckets[0]?.maskType);
    override.mask = {
      kind: kind ?? 'rect',
      cornerRadius: firstNumber(node.cornerRadius, node.radius),
      curvature: firstNumber(node.curvature, node.strength),
      svgPath: firstString(node.svgPath, node.path),
    };
  }

  if (overlayNode) {
    if (typeof overlayNode === 'string') {
      override.overlay = { uri: overlayNode };
    } else if (isRecord(overlayNode)) {
      override.overlay = {
        uri: firstString(overlayNode.uri, overlayNode.url, overlayNode.image),
        opacity: firstNumber(overlayNode.opacity, overlayNode.alpha),
      };
    }
  }

  return Object.keys(override).length ? override : null;
}

const SIZE_OPTIONS = [
  { id: 'standard', label: 'Standard', sub: 'Regular size' },
  { id: 'large', label: 'Large', sub: 'Premium (+ \u20B9249)' },
];

const BASE_COLORS = [
  { id: 'white', label: 'White', color: '#FFFFFF', border: '#E0E0E0' },
  { id: 'black', label: 'Black', color: '#000000', border: '#000000' },
  { id: 'mix', label: 'Mix', color: '#C0C0C0', border: '#C0C0C0' },
];

const INTERIOR_COLORS = [
  { id: 'white', color: '#FFFFFF', border: '#E0E0E0' },
  { id: 'red', color: '#EF4444' },
  { id: 'pink', color: '#EC4899' },
  { id: 'orange', color: '#F97316' },
  { id: 'yellow', color: '#EAB308' },
  { id: 'green', color: '#22C55E' },
  { id: 'blue', color: '#3B82F6' },
  { id: 'black', color: '#000000' },
];

function mapFlowTypeForDesignService(
  flowType: 'printing' | 'gifting' | 'shopping',
): 'business_printing' | 'gifting' | 'shopping' {
  if (flowType === 'printing') return 'business_printing';
  return flowType;
}

function inferBusinessPrintType(name: string): string {
  const n = String(name || '').toLowerCase();
  if (n.includes('business') && n.includes('card')) return 'business_card';
  if (n.includes('flyer')) return 'flyers';
  if (n.includes('leaflet')) return 'leaflets';
  if (n.includes('brochure')) return 'brochures';
  if (n.includes('poster')) return 'posters';
  if (n.includes('letterhead')) return 'letterheads';
  return 'custom_stationery';
}

function inferMimeTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

type SavedCustomizationDraft = {
  selectedSize?: string;
  selectedBase?: string;
  selectedInterior?: string;
  businessSides?: string;
  businessQuantity?: number;
  businessDeliveryMethod?: 'pickup' | 'delivery';
  businessServicePackage?: 'standard' | 'express' | 'instant' | '';
  selectedPickupShopId?: string;
  businessDesignType?: 'premium' | 'normal';
  readyToPrintFile?: productsApi.UploadedFile | null;
};

type BusinessDeliveryMethod = 'pickup' | 'delivery';
type BusinessServicePackage = 'standard' | 'express' | 'instant' | '';

type PickupLocationItem = {
  id: string;
  title: string;
  address: string;
  pincode: string;
};

const BUSINESS_PRINT_SIDES = [
  { id: 'single_sided', label: 'Single-sided' },
  { id: 'double_sided', label: 'Double-sided' },
] as const;

function normalizeBusinessServicePackage(value: string): BusinessServicePackage {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('instant')) return 'instant';
  if (normalized.includes('express')) return 'express';
  if (normalized.includes('standard')) return 'standard';
  return '';
}

async function ensureDataUriFromLocalImage(uri?: string): Promise<string | undefined> {
  if (!uri) return undefined;
  if (uri.startsWith('data:')) return uri;
  if (!uri.startsWith('file://')) return undefined;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) return undefined;
    return `data:${inferMimeTypeFromUri(uri)};base64,${base64}`;
  } catch {
    return undefined;
  }
}

export function CustomizeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    productId,
    flowType = 'gifting',
    image: passedImage,
    name: passedName,
    designId: passedDesignId,
    businessConfigDraft,
  } = route.params ?? {};
  const { colors: t, mode: themeMode } = useThemeStore();
  const addItem = useCartStore((s) => s.addItem);

  const skiaCanvasRef = useRef<SkiaProductCanvasHandle>(null);
  const previewCaptureRef = useRef<View>(null);
  const [selectedSize, setSelectedSize] = useState('standard');
  const [selectedBase, setSelectedBase] = useState('white');
  const [selectedInterior, setSelectedInterior] = useState('white');
  const [businessSides, setBusinessSides] = useState(
    businessConfigDraft?.selectedOptions?.sides || 'single_sided',
  );
  const [businessDesignType, setBusinessDesignType] = useState<'premium' | 'normal'>(
    businessConfigDraft?.designType || 'normal',
  );
  const [businessQuantity, setBusinessQuantity] = useState(
    Math.max(1, Number(businessConfigDraft?.quantity || 1)),
  );
  const [businessDeliveryMethod, setBusinessDeliveryMethod] = useState<BusinessDeliveryMethod>(
    businessConfigDraft?.deliveryMethod || 'delivery',
  );
  const [businessServicePackage, setBusinessServicePackage] = useState<BusinessServicePackage>(
    businessConfigDraft?.servicePackage || 'standard',
  );
  const [pickupLocations, setPickupLocations] = useState<PickupLocationItem[]>([]);
  const [pickupLocationsLoading, setPickupLocationsLoading] = useState(false);
  const [selectedPickupShopId, setSelectedPickupShopId] = useState(businessConfigDraft?.shopId || '');
  const [servicePackages, setServicePackages] = useState<Array<{ id: BusinessServicePackage; label: string; duration?: string }>>([]);
  const [userImageUri, setUserImageUri] = useState<string | null>(null);
  const [readyPrintUploadedFile, setReadyPrintUploadedFile] = useState<productsApi.UploadedFile | null>(null);
  const [uploadingReadyPrint, setUploadingReadyPrint] = useState(false);
  const [exportedUri, setExportedUri] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [canvasResetVersion, setCanvasResetVersion] = useState(0);
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  /** Natural pixel size of the mockup, required so the print zone lines up with the product. */
  const [productNaturalSize, setProductNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [productNaturalSizeFailed, setProductNaturalSizeFailed] = useState(false);

  const [productImageUri, setProductImageUri] = useState<string | undefined>(passedImage);
  const [productName, setProductName] = useState(passedName || 'Product');
  const [unitPrice, setUnitPrice] = useState(0);
  const [stockState, setStockState] = useState<LiveStockState>({ inStock: true, availableStock: null, message: '' });
  const [businessPrintType, setBusinessPrintType] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(!passedImage);
  const [productCanvasOverride, setProductCanvasOverride] = useState<Partial<ProductCanvasConfig> | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [manualPrintArea, setManualPrintArea] = useState<ProductCanvasConfig['printArea'] | null>(null);
  const [manualMaskOverride, setManualMaskOverride] = useState<Partial<ProductCanvasConfig['mask']> | null>(null);
  const [showPrintAreaEditor, setShowPrintAreaEditor] = useState(false);
  const [isAreaHandleDragging, setIsAreaHandleDragging] = useState(false);
  const [isTextDragging, setIsTextDragging] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [productKindSearchText, setProductKindSearchText] = useState(
    [passedName, passedImage].filter(Boolean).join(' '),
  );
  const dragStartRef = useRef<{
    handle: CornerHandle;
    startArea: ProductCanvasConfig['printArea'];
  } | null>(null);
  const currentAreaRef = useRef<ProductCanvasConfig['printArea'] | null>(null);
  const textLayersRef = useRef<TextLayer[]>([]);
  const textDragStartRef = useRef<{ id: string; startX: number; startY: number } | null>(null);
  const activeTextIdRef = useRef<string | null>(null);
  const barrelStartRef = useRef<{
    handle: BarrelHandle;
    start: {
      curvature: number;
      topCurve: number;
      bottomCurve: number;
      edgeInset: number;
    };
  } | null>(null);
  const cornerRadiusStartRef = useRef<number>(0);
  const baseCanvasConfigRef = useRef<ProductCanvasConfig | null>(null);
  const fittedPreviewRectRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const canvasSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const productMaskRef = useRef<ProductMaskSpec | null>(null);
  const initKeyRef = useRef<string | null>(null);

  const accentColor =
    flowType === 'printing' ? '#4CA1AF'
    : flowType === 'shopping' ? '#FF6B6B'
    : '#0F766E';

  const activeBg =
    flowType === 'printing'
      ? (themeMode === 'dark' ? '#4CA1AF20' : '#EEF9FB')
      : flowType === 'shopping'
        ? (themeMode === 'dark' ? '#FF6B6B20' : '#FFF0F0')
        : (themeMode === 'dark' ? '#0F766E20' : '#F0FDFA');

  useEffect(() => {
    const initKey = [productId ?? '', flowType ?? '', passedName ?? '', passedImage ?? ''].join('|');
    if (initKeyRef.current === initKey) return;
    initKeyRef.current = initKey;

    setProductCanvasOverride(null);
    setBusinessPrintType(null);
    setManualPrintArea(null);
    setManualMaskOverride(null);
    setShowPrintAreaEditor(false);
    setIsAreaHandleDragging(false);
    setIsTextDragging(false);
    setCanvasResetVersion(0);
    setBusinessSides(businessConfigDraft?.selectedOptions?.sides || 'single_sided');
    setBusinessDesignType(businessConfigDraft?.designType || 'normal');
    setBusinessQuantity(Math.max(1, Number(businessConfigDraft?.quantity || 1)));
    setBusinessDeliveryMethod(businessConfigDraft?.deliveryMethod || 'delivery');
    setBusinessServicePackage(businessConfigDraft?.servicePackage || 'standard');
    setSelectedPickupShopId(businessConfigDraft?.shopId || '');
    setReadyPrintUploadedFile(null);
    if (businessConfigDraft?.selectedOptions?.size) {
      setSelectedSize(businessConfigDraft.selectedOptions.size);
    }
    if (businessConfigDraft?.selectedOptions?.paperType) {
      setSelectedBase(businessConfigDraft.selectedOptions.paperType);
    }
    if (businessConfigDraft?.selectedOptions?.finish) {
      setSelectedInterior(businessConfigDraft.selectedOptions.finish);
    }
    setSelectedTextId(null);
    setTextDraft('');
    setTextColor(TEXT_COLORS[0]);
    setTextLayers([]);
    if (passedName) {
      setProductName(passedName);
    }
    setProductKindSearchText([passedName, passedImage].filter(Boolean).join(' '));
    if (passedImage) {
      setProductImageUri(toAbsoluteAssetUrl(passedImage));
      setLoadingImage(false);
    }
    if (productId && isLikelyMongoId(productId)) {
      const productRequest =
        flowType === 'gifting'
          ? productsApi.getGiftingProduct(productId)
          : flowType === 'shopping'
            ? productsApi.getShoppingProduct(productId)
            : productsApi.getProductById(productId);
      productRequest
        .then((p) => {
          if (p.name) setProductName(p.name);
          const pricing = resolveProductPricing(p);
          setUnitPrice(pricing.price);
          setStockState(getLiveStockState(p, 1));
          const thumb = getProductImageUrl(p);
          if (thumb && !passedImage) {
            setProductImageUri(thumb);
          }
          const category = entityName(p.category);
          const subcategory = entityName(p.subcategory);
          const tagText = Array.isArray(p.tags) ? p.tags.join(' ') : '';
          const kindHint = firstString(
            (p as any).product_kind,
            (p as any).productKind,
            p.slug,
            category,
            subcategory,
            tagText,
          );
          const businessType = firstString(
            (p as any).business_print_type,
            (p as any).businessPrintType,
          );
          if (businessType) {
            setBusinessPrintType(businessType);
          }
          setProductKindSearchText(
            [p.name, p.slug, category, subcategory, tagText, kindHint, thumb].filter(Boolean).join(' '),
          );
          const override = extractCanvasOverrideFromProduct(p);
          if (override) {
            setProductCanvasOverride(override);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingImage(false));
    } else {
      setLoadingImage(false);
    }
  }, [businessConfigDraft, flowType, passedImage, passedName, productId]);

  useEffect(() => {
    if (flowType !== 'printing') return;
    let active = true;
    setPickupLocationsLoading(true);

    Promise.all([
      productsApi.getServicePackages().catch(() => []),
      productsApi.getPickupLocations().catch(() => []),
    ])
      .then(([packagesRes, locationsRes]) => {
        if (!active) return;

        const mappedPackages = (packagesRes || [])
          .map((pkg: any) => {
            const id = normalizeBusinessServicePackage(pkg?.id || pkg?._id || pkg?.slug || pkg?.name);
            if (!id) return null;
            return {
              id,
              label: String(pkg?.name || id).trim(),
              duration: String(pkg?.duration || pkg?.deliveryTime || '').trim(),
            };
          })
          .filter(Boolean) as Array<{ id: BusinessServicePackage; label: string; duration?: string }>;

        setServicePackages(
          mappedPackages.length
            ? mappedPackages
            : [
                { id: 'standard', label: 'Standard' },
                { id: 'express', label: 'Express' },
                { id: 'instant', label: 'Instant' },
              ],
        );
        if (!businessConfigDraft?.servicePackage) {
          const firstPackage = mappedPackages[0]?.id || 'standard';
          setBusinessServicePackage(firstPackage);
        }

        const mappedLocations = (locationsRes || [])
          .map((loc: any): PickupLocationItem | null => {
            const id = String(loc?._id || loc?.id || '').trim();
            if (!id) return null;
            const title = String(loc?.name || loc?.shopName || loc?.storeName || 'Pickup location').trim();
            const addressParts = [
              loc?.address,
              loc?.addressLine,
              loc?.area,
              loc?.locality,
              loc?.landmark,
              loc?.city,
              loc?.state,
            ]
              .map((part: any) => String(part || '').trim())
              .filter(Boolean);
            const pincode = String(loc?.pincode || '').trim();
            return {
              id,
              title,
              address: [addressParts.join(', '), pincode].filter(Boolean).join(' - '),
              pincode,
            };
          })
          .filter(Boolean) as PickupLocationItem[];

        setPickupLocations(mappedLocations);
        if (!selectedPickupShopId && mappedLocations[0]?.id) {
          setSelectedPickupShopId(mappedLocations[0].id);
        }
      })
      .finally(() => {
        if (active) setPickupLocationsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [flowType]);

  useEffect(() => {
    if (!passedDesignId) return;
    designsApi.getDesign(passedDesignId)
      .then((design) => {
        if (design.previewImage) {
          setUserImageUri(toAbsoluteAssetUrl(design.previewImage));
        }
        if (design.canvasJson?.textLayers?.length) {
          setTextLayers(design.canvasJson.textLayers);
        }
        const customization = isRecord(design.canvasJson?.customization) ? design.canvasJson.customization : null;
        if (customization) {
          if (typeof customization.selectedSize === 'string') setSelectedSize(customization.selectedSize);
          if (typeof customization.selectedBase === 'string') setSelectedBase(customization.selectedBase);
          if (typeof customization.selectedInterior === 'string') setSelectedInterior(customization.selectedInterior);
          if (typeof customization.businessSides === 'string') setBusinessSides(customization.businessSides);
          if (typeof customization.businessQuantity === 'number' && Number.isFinite(customization.businessQuantity)) {
            setBusinessQuantity(Math.max(1, customization.businessQuantity));
          }
          if (customization.businessDeliveryMethod === 'pickup' || customization.businessDeliveryMethod === 'delivery') {
            setBusinessDeliveryMethod(customization.businessDeliveryMethod);
          }
          if (typeof customization.businessServicePackage === 'string') {
            setBusinessServicePackage(customization.businessServicePackage as BusinessServicePackage);
          }
          if (typeof customization.selectedPickupShopId === 'string') {
            setSelectedPickupShopId(customization.selectedPickupShopId);
          }
          if (customization.businessDesignType === 'premium' || customization.businessDesignType === 'normal') {
            setBusinessDesignType(customization.businessDesignType);
          }
          if (customization.readyToPrintFile && typeof customization.readyToPrintFile === 'object') {
            setReadyPrintUploadedFile(customization.readyToPrintFile as productsApi.UploadedFile);
          }
        }
      })
      .catch(() => {});
  }, [passedDesignId]);

  useEffect(() => {
    let isActive = true;
    setCanvasReady(false);
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      if (isActive) {
        setCanvasReady(true);
      }
    });
    return () => {
      isActive = false;
      interactionTask.cancel();
    };
  }, [flowType, passedImage, passedName, productId]);

  // Resolve to a guaranteed image (remote URI to local fallback for the flow)
  const resolvedImage = React.useMemo(() => {
    if (productImageUri) return productImageUri;
    const fallback = FALLBACK_IMAGES[flowType];
    if (!fallback) return undefined;
    try {
      // For local require()'d assets, resolve to a usable URI
      const src = Image.resolveAssetSource(fallback);
      return src?.uri;
    } catch {
      return undefined;
    }
  }, [productImageUri, flowType]);

  const totalPrice = React.useMemo(() => unitPrice * businessQuantity, [businessQuantity, unitPrice]);
  const savedCustomizationDraft = React.useMemo<SavedCustomizationDraft>(() => ({
    selectedSize,
    selectedBase,
    selectedInterior,
    businessSides,
    businessQuantity,
    businessDeliveryMethod,
    businessServicePackage,
    selectedPickupShopId,
    businessDesignType,
    readyToPrintFile: readyPrintUploadedFile,
  }), [
    businessDeliveryMethod,
    businessDesignType,
    businessQuantity,
    businessServicePackage,
    businessSides,
    readyPrintUploadedFile,
    selectedBase,
    selectedInterior,
    selectedPickupShopId,
    selectedSize,
  ]);

  const readyPrintStatusText = React.useMemo(() => {
    if (uploadingReadyPrint) return 'Uploading ready-to-print file...';
    if (readyPrintUploadedFile?.name) {
      const pageText = readyPrintUploadedFile.pageCount ? ` • ${readyPrintUploadedFile.pageCount} pages` : '';
      return `${readyPrintUploadedFile.name}${pageText}`;
    }
    return 'Upload PDF, DOC, DOCX, JPG, or PNG if your artwork is already final.';
  }, [readyPrintUploadedFile, uploadingReadyPrint]);

  const pickReadyPrintFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/png',
          'image/jpeg',
          'image/jpg',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      let resolvedUri = asset.uri;
      if (resolvedUri.startsWith('content://')) {
        const safeName = String(asset.name || 'design-file')
          .replace(/[^\w.\-]/g, '_')
          .replace(/_+/g, '_');
        const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (baseDir) {
          const uploadDir = `${baseDir}custom-uploads/`;
          await FileSystem.makeDirectoryAsync(uploadDir, { intermediates: true });
          const target = `${uploadDir}${Date.now()}-${safeName || 'design-file'}`;
          await FileSystem.copyAsync({ from: resolvedUri, to: target });
          resolvedUri = target;
        }
      }

      setUploadingReadyPrint(true);
      try {
        const uploaded = await productsApi.uploadPrintingFile({
          uri: resolvedUri,
          name: asset.name ?? 'design-file',
          mimeType: asset.mimeType,
        });
        setReadyPrintUploadedFile(uploaded);
        Alert.alert('Design uploaded', 'Your ready-to-print file has been attached to this product.');
      } catch (e: any) {
        setReadyPrintUploadedFile(null);
        Alert.alert('Upload failed', e?.serverMessage || e?.response?.data?.message || e?.message || 'Could not upload the design file. Please try another file.');
      } finally {
        setUploadingReadyPrint(false);
      }
    } catch {
      setUploadingReadyPrint(false);
    }
  }, []);

  const clearReadyPrintFile = useCallback(() => {
    setReadyPrintUploadedFile(null);
  }, []);

  useEffect(() => {
    setProductNaturalSize(null);
    setProductNaturalSizeFailed(false);
    if (!resolvedImage) {
      setImgAspect(null);
      return;
    }
    try {
      Image.getSize(
        resolvedImage,
        (w, h) => {
          if (w > 0 && h > 0) {
            setImgAspect(w / h);
            setProductNaturalSize({ width: w, height: h });
          } else {
            setImgAspect(null);
            setProductNaturalSizeFailed(true);
          }
        },
        () => {
          setImgAspect(null);
          setProductNaturalSizeFailed(true);
        },
      );
    } catch {
      setImgAspect(null);
      setProductNaturalSizeFailed(true);
    }
  }, [resolvedImage]);

  /** Wait for dimensions before mounting the editor so design coords match the mockup (no jump). */
  const canvasLayoutReady = !resolvedImage || productNaturalSize !== null || productNaturalSizeFailed;
  const canvasW = SCREEN_W - Spacing.lg * 2;
  // Canvas must be the dominant element on the screen (real print-shop UX).
  // Use ~55% of viewport height as the maximum, with a roomy minimum.
  const MIN_H = Math.round(SCREEN_H * 0.42);
  const MAX_H = Math.round(SCREEN_H * 0.58);
  const canvasH = imgAspect
    ? Math.round(Math.max(MIN_H, Math.min(MAX_H, canvasW / imgAspect)))
    : Math.round(SCREEN_H * 0.5);

  // Resolve product type to print-area (where designs will physically print)
  const productKindQuery = React.useMemo(
    () => [productName, passedName, productKindSearchText, resolvedImage].filter(Boolean).join(' '),
    [productKindSearchText, productName, passedName, resolvedImage],
  );
  const productKind = React.useMemo(
    () => detectProductKind(productKindQuery, flowType),
    [productKindQuery, flowType],
  );
  const baseCanvasConfig = React.useMemo(
    () => applyCanvasOverride(productKind, PRODUCT_CANVAS_CONFIGS[productKind], productCanvasOverride),
    [productCanvasOverride, productKind],
  );
  const effectivePrintArea = manualPrintArea ?? baseCanvasConfig.printArea;
  const effectiveMask = React.useMemo(
    () => ({ ...baseCanvasConfig.mask, ...(manualMaskOverride ?? {}) }),
    [baseCanvasConfig.mask, manualMaskOverride],
  );
  const productCanvasConfig = React.useMemo(
    () => ({
      ...baseCanvasConfig,
      printArea: effectivePrintArea,
      mask: effectiveMask,
    }),
    [baseCanvasConfig, effectiveMask, effectivePrintArea],
  );
  useEffect(() => {
    currentAreaRef.current = effectivePrintArea;
  }, [effectivePrintArea]);
  useEffect(() => {
    textLayersRef.current = textLayers;
  }, [textLayers]);
  useEffect(() => {
    baseCanvasConfigRef.current = baseCanvasConfig;
  }, [baseCanvasConfig]);
  useEffect(() => {
    productMaskRef.current = productCanvasConfig.mask;
  }, [productCanvasConfig.mask]);
  useEffect(() => {
    canvasSizeRef.current = { w: canvasW, h: canvasH };
  }, [canvasW, canvasH]);

  const fittedPreviewRect = React.useMemo(
    () => fitContainRect(canvasW, canvasH, productNaturalSize?.width, productNaturalSize?.height),
    [canvasH, canvasW, productNaturalSize?.height, productNaturalSize?.width],
  );
  useEffect(() => {
    fittedPreviewRectRef.current = fittedPreviewRect;
  }, [fittedPreviewRect]);
  const editablePrintRect = React.useMemo(() => {
    const area = effectivePrintArea;
    return {
      x: fittedPreviewRect.x + area.left * fittedPreviewRect.w,
      y: fittedPreviewRect.y + area.top * fittedPreviewRect.h,
      w: (area.right - area.left) * fittedPreviewRect.w,
      h: (area.bottom - area.top) * fittedPreviewRect.h,
    };
  }, [effectivePrintArea, fittedPreviewRect]);
  const barrelGeometry = React.useMemo(() => {
    const curvature = clampRange(productCanvasConfig.mask.curvature ?? 0.8, 0.2, 1);
    const edgeInset = clampRange(productCanvasConfig.mask.edgeInset ?? 1, 0.35, 1.6);
    const topCurve = clampRange(productCanvasConfig.mask.topCurve ?? 0.15, -1.2, 1.2);
    const bottomCurve = clampRange(productCanvasConfig.mask.bottomCurve ?? 0.12, -1.2, 1.2);
    const bow = Math.min(editablePrintRect.h * 0.18, editablePrintRect.w * 0.14) * curvature;
    return { curvature, edgeInset, topCurve, bottomCurve, bow };
  }, [
    editablePrintRect.h,
    editablePrintRect.w,
    productCanvasConfig.mask.bottomCurve,
    productCanvasConfig.mask.curvature,
    productCanvasConfig.mask.edgeInset,
    productCanvasConfig.mask.topCurve,
  ]);
  const barrelHandlePositions = React.useMemo(() => {
    const xMid = editablePrintRect.x + editablePrintRect.w / 2;
    const topYRaw = editablePrintRect.y + barrelGeometry.bow * barrelGeometry.topCurve;
    const bottomYRaw = editablePrintRect.y + editablePrintRect.h + barrelGeometry.bow * barrelGeometry.bottomCurve;
    // Allow top/bottom handles to move above and below, not just around center.
    const topY = clampRange(topYRaw, editablePrintRect.y - 52, editablePrintRect.y + editablePrintRect.h + 20);
    const bottomY = clampRange(bottomYRaw, editablePrintRect.y - 20, editablePrintRect.y + editablePrintRect.h + 52);
    const depthX = clampRange(
      editablePrintRect.x + editablePrintRect.w + (barrelGeometry.curvature - 0.45) * 34,
      editablePrintRect.x + editablePrintRect.w - 2,
      editablePrintRect.x + editablePrintRect.w + 30,
    );
    const depthY = editablePrintRect.y + editablePrintRect.h / 2;
    return { top: { x: xMid, y: topY }, bottom: { x: xMid, y: bottomY }, depth: { x: depthX, y: depthY } };
  }, [barrelGeometry.bow, barrelGeometry.bottomCurve, barrelGeometry.curvature, barrelGeometry.topCurve, editablePrintRect.h, editablePrintRect.w, editablePrintRect.x, editablePrintRect.y]);

  const pickUserImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload your design.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.95,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setUserImageUri(result.assets[0].uri);
      setExportedUri(null);
    }
  }, []);

  const handleResetTransforms = useCallback(() => {
    skiaCanvasRef.current?.resetTransforms();
    setExportedUri(null);
    setCanvasResetVersion((prev) => prev + 1);
  }, []);

  // IMPORTANT: read live values from refs so this callback, and therefore the
  // PanResponder that uses it, stays referentially stable across renders.
  // Otherwise the responder is re-created mid-gesture and the drag "snaps back".
  const updateManualAreaFromDrag = useCallback(
    (handle: CornerHandle, dx: number, dy: number, startArea: ProductCanvasConfig['printArea']) => {
      const fit = fittedPreviewRectRef.current;
      const baseArea = baseCanvasConfigRef.current?.printArea ?? startArea;
      const nx = (dx * AREA_DRAG_GAIN) / Math.max(1, fit.w);
      const ny = (dy * AREA_DRAG_GAIN) / Math.max(1, fit.h);

      let left = startArea.left;
      let top = startArea.top;
      let right = startArea.right;
      let bottom = startArea.bottom;

      if (handle === 'tl' || handle === 'bl') left += nx;
      if (handle === 'tr' || handle === 'br') right += nx;
      if (handle === 'tl' || handle === 'tr') top += ny;
      if (handle === 'bl' || handle === 'br') bottom += ny;

      left = clamp01(left);
      top = clamp01(top);
      right = clamp01(right);
      bottom = clamp01(bottom);

      if (right - left < MIN_PRINT_AREA_SIZE) {
        if (handle === 'tl' || handle === 'bl') left = right - MIN_PRINT_AREA_SIZE;
        else right = left + MIN_PRINT_AREA_SIZE;
      }
      if (bottom - top < MIN_PRINT_AREA_SIZE) {
        if (handle === 'tl' || handle === 'tr') top = bottom - MIN_PRINT_AREA_SIZE;
        else bottom = top + MIN_PRINT_AREA_SIZE;
      }

      const nextArea = sanitizeEditablePrintArea(
        {
          left: clamp01(left),
          top: clamp01(top),
          right: clamp01(right),
          bottom: clamp01(bottom),
          label: startArea.label || baseArea.label,
        },
        baseArea,
      );
      setManualPrintArea(nextArea);
      setExportedUri(null);
    },
    [],
  );

  // Single stable factory, zero deps, so each corner's PanResponder is created
  // exactly once for the lifetime of the screen.
  const makeCornerPanResponder = useCallback(
    (handle: CornerHandle) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          setIsAreaHandleDragging(true);
          const startArea =
            currentAreaRef.current ??
            baseCanvasConfigRef.current?.printArea ?? {
              left: 0.15,
              top: 0.2,
              right: 0.85,
              bottom: 0.8,
              label: 'Print Area',
            };
          dragStartRef.current = { handle, startArea };
        },
        onPanResponderMove: (_, gesture) => {
          const drag = dragStartRef.current;
          if (!drag) return;
          updateManualAreaFromDrag(drag.handle, gesture.dx, gesture.dy, drag.startArea);
        },
        onPanResponderRelease: () => {
          setIsAreaHandleDragging(false);
          dragStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          setIsAreaHandleDragging(false);
          dragStartRef.current = null;
        },
      }),
    [updateManualAreaFromDrag],
  );

  const cornerResponders = React.useMemo(
    () => ({
      tl: makeCornerPanResponder('tl'),
      tr: makeCornerPanResponder('tr'),
      bl: makeCornerPanResponder('bl'),
      br: makeCornerPanResponder('br'),
    }),
    [makeCornerPanResponder],
  );

  const toggleAreaEditor = useCallback(() => {
    setShowPrintAreaEditor((prev) => !prev);
  }, []);

  const handleResetArea = useCallback(() => {
    setManualPrintArea(null);
    setManualMaskOverride(null);
  }, []);

  const handleSelectTextLayer = useCallback((id: string) => {
    const layer = textLayersRef.current.find((item) => item.id === id);
    if (!layer) return;
    setSelectedTextId(id);
    setTextDraft(layer.text);
    setTextColor(layer.color);
  }, []);

  const handleAddOrUpdateText = useCallback(() => {
    const value = textDraft.trim();
    if (!value) {
      Alert.alert('Add text', 'Please type text first.');
      return;
    }

    if (selectedTextId) {
      setTextLayers((prev) =>
        prev.map((item) =>
          item.id === selectedTextId ? { ...item, text: value, color: textColor } : item,
        ),
      );
    } else {
      const id = `txt-${Date.now()}`;
      setTextLayers((prev) => [
        ...prev,
        {
          id,
          text: value,
          color: textColor,
          x: canvasW * 0.28,
          y: canvasH * 0.46,
        },
      ]);
      setSelectedTextId(id);
    }
    setExportedUri(null);
  }, [canvasH, canvasW, selectedTextId, textColor, textDraft]);

  const handleRemoveText = useCallback(() => {
    if (!selectedTextId) return;
    setTextLayers((prev) => prev.filter((item) => item.id !== selectedTextId));
    setSelectedTextId(null);
    setTextDraft('');
    setExportedUri(null);
  }, [selectedTextId]);

  // Each text layer keeps its OWN PanResponder across renders. Rebuilding a
  // responder inline per-render was dropping the native responder lock mid-drag
  // and snapping the text back to the initial position.
  const textResponderMapRef = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map());
  const buildTextPanResponder = useCallback((id: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        setIsTextDragging(true);
        setSelectedTextId(id);
        activeTextIdRef.current = id;
        const layer = textLayersRef.current.find((item) => item.id === id);
        textDragStartRef.current = {
          id,
          startX: layer?.x ?? 0,
          startY: layer?.y ?? 0,
        };
      },
      onPanResponderMove: (_, gesture) => {
        const drag = textDragStartRef.current;
        if (!drag || drag.id !== id) return;
        const cw = canvasSizeRef.current.w || 300;
        const ch = canvasSizeRef.current.h || 300;
        const nextX = clampRange(drag.startX + gesture.dx * TEXT_DRAG_GAIN, -12, cw - 36);
        const nextY = clampRange(drag.startY + gesture.dy * TEXT_DRAG_GAIN, -8, ch - 30);
        setTextLayers((prev) => prev.map((item) => (item.id === id ? { ...item, x: nextX, y: nextY } : item)));
      },
      onPanResponderRelease: () => {
        setIsTextDragging(false);
        textDragStartRef.current = null;
        activeTextIdRef.current = null;
        setExportedUri(null);
      },
      onPanResponderTerminate: () => {
        setIsTextDragging(false);
        textDragStartRef.current = null;
        activeTextIdRef.current = null;
        setExportedUri(null);
      },
    });
  }, []);
  const getTextPanResponder = useCallback(
    (id: string) => {
      const map = textResponderMapRef.current;
      let existing = map.get(id);
      if (!existing) {
        existing = buildTextPanResponder(id);
        map.set(id, existing);
      }
      return existing;
    },
    [buildTextPanResponder],
  );
  // Garbage-collect responders when layers are removed.
  useEffect(() => {
    const map = textResponderMapRef.current;
    const validIds = new Set(textLayers.map((layer) => layer.id));
    Array.from(map.keys()).forEach((id) => {
      if (!validIds.has(id)) map.delete(id);
    });
  }, [textLayers]);

  // Read fitted-rect from ref so the callback is stable.
  const updateBarrelMaskFromDrag = useCallback(
    (handle: BarrelHandle, dx: number, dy: number, start: { curvature: number; topCurve: number; bottomCurve: number; edgeInset: number }) => {
      const fit = fittedPreviewRectRef.current;
      const nx = (dx * CURVE_DRAG_GAIN) / Math.max(1, fit.w);
      const ny = (dy * CURVE_DRAG_GAIN) / Math.max(1, fit.h);
      let next = { ...start };

      if (handle === 'topArc') {
        next.topCurve = clampRange(start.topCurve + ny * 4.0, -1.35, 1.35);
        next.edgeInset = clampRange(start.edgeInset - ny * 1.35, 0.3, 1.8);
      } else if (handle === 'bottomArc') {
        next.bottomCurve = clampRange(start.bottomCurve + ny * 4.0, -1.35, 1.35);
        next.edgeInset = clampRange(start.edgeInset + ny * 1.0, 0.3, 1.8);
      } else {
        next.curvature = clampRange(start.curvature + nx * 2.1, 0.12, 1);
        next.edgeInset = clampRange(start.edgeInset - nx * 1.8, 0.3, 1.8);
      }

      setManualMaskOverride((prev) => ({
        ...(prev ?? {}),
        kind: 'barrel',
        curvature: next.curvature,
        topCurve: next.topCurve,
        bottomCurve: next.bottomCurve,
        edgeInset: next.edgeInset,
      }));
      setExportedUri(null);
    },
    [],
  );

  // Fully stable, reads current mask values from ref on grant.
  const makeBarrelPanResponder = useCallback(
    (handle: BarrelHandle) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          setIsAreaHandleDragging(true);
          const mask = productMaskRef.current;
          barrelStartRef.current = {
            handle,
            start: {
              curvature: mask?.curvature ?? 0.8,
              topCurve: mask?.topCurve ?? 0.12,
              bottomCurve: mask?.bottomCurve ?? 0.12,
              edgeInset: mask?.edgeInset ?? 1,
            },
          };
        },
        onPanResponderMove: (_, gesture) => {
          const drag = barrelStartRef.current;
          if (!drag) return;
          updateBarrelMaskFromDrag(drag.handle, gesture.dx, gesture.dy, drag.start);
        },
        onPanResponderRelease: () => {
          setIsAreaHandleDragging(false);
          barrelStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          setIsAreaHandleDragging(false);
          barrelStartRef.current = null;
        },
      }),
    [updateBarrelMaskFromDrag],
  );

  const barrelResponders = React.useMemo(
    () => ({
      topArc: makeBarrelPanResponder('topArc'),
      bottomArc: makeBarrelPanResponder('bottomArc'),
      depth: makeBarrelPanResponder('depth'),
    }),
    [makeBarrelPanResponder],
  );

  const updateCornerRadiusFromDrag = useCallback((dx: number, dy: number, startRadius: number) => {
    const delta = (-dx + dy) / 4;
    const next = clampRange(startRadius + delta, 0, 72);
    setManualMaskOverride((prev) => ({
      ...(prev ?? {}),
      kind: 'roundedRect',
      cornerRadius: next,
    }));
    setExportedUri(null);
  }, []);

  const cornerRadiusResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          setIsAreaHandleDragging(true);
          cornerRadiusStartRef.current = productMaskRef.current?.cornerRadius ?? 10;
        },
        onPanResponderMove: (_, gesture) => {
          updateCornerRadiusFromDrag(gesture.dx, gesture.dy, cornerRadiusStartRef.current);
        },
        onPanResponderRelease: () => {
          setIsAreaHandleDragging(false);
        },
        onPanResponderTerminate: () => {
          setIsAreaHandleDragging(false);
        },
      }),
    [updateCornerRadiusFromDrag],
  );

  const captureDesignSnapshot = useCallback(async (): Promise<{ imageUri: string; previewDataUri?: string }> => {
    setExporting(true);
    try {
      if (previewCaptureRef.current) {
        const imageUri = await captureRef(previewCaptureRef, {
          format: 'png',
          quality: 1,
        });
        if (imageUri) {
          setExportedUri(imageUri);
          let previewDataUri: string | undefined;
          try {
            // Save a compressed inline preview so admin-facing systems can read it
            // via designId even when local `file://` paths are inaccessible.
            previewDataUri = await captureRef(previewCaptureRef, {
              format: 'jpg',
              quality: 0.72,
              result: 'data-uri',
            }) as string;
          } catch {
            previewDataUri = undefined;
          }
          return { imageUri, previewDataUri };
        }
      }
      if (userImageUri && skiaCanvasRef.current) {
        const imageUri = await skiaCanvasRef.current.exportSnapshot();
        if (imageUri) {
          setExportedUri(imageUri);
          const previewDataUri = await ensureDataUriFromLocalImage(imageUri);
          return { imageUri, previewDataUri };
        }
      }
    } catch {
      // fallback below
    } finally {
      setExporting(false);
    }
    const fallbackImageUri = exportedUri || resolvedImage || '';
    const previewDataUri = await ensureDataUriFromLocalImage(fallbackImageUri);
    return { imageUri: fallbackImageUri, previewDataUri };
  }, [userImageUri, exportedUri, resolvedImage]);

  const persistDesignOrThrow = useCallback(
    async (previewDataUri?: string): Promise<string> => {
      if (passedDesignId) {
        try {
        const updated = await designsApi.updateDesign(passedDesignId, {
          name: `${productName} custom design`,
          canvasJson: {
            source: 'speedcopy-mobile-customizer',
            textLayers,
            printArea: productCanvasConfig.printArea,
            mask: productCanvasConfig.mask,
            hasUserImage: Boolean(userImageUri),
            hasReadyToPrintFile: Boolean(readyPrintUploadedFile?.url),
            customization: savedCustomizationDraft,
          },
          previewImage: previewDataUri,
        });
          if (!updated?._id) {
            throw new Error('Design update returned no id.');
          }
          return updated._id;
        } catch (e: any) {
          throw new Error(e?.serverMessage || e?.message || 'Failed to update your customized design.');
        }
      }

      if (!productId || !isLikelyMongoId(productId)) {
        throw new Error('This product is missing a valid backend id. Please open a real product and try again.');
      }
      if (!previewDataUri) {
        throw new Error('Could not prepare your design preview. Please try again.');
      }

      try {
        const savedDesign = await designsApi.saveDesign({
          productId,
          name: `${productName} custom design`,
          flowType: mapFlowTypeForDesignService(flowType),
          canvasJson: {
            source: 'speedcopy-mobile-customizer',
            textLayers,
            printArea: productCanvasConfig.printArea,
            mask: productCanvasConfig.mask,
            hasUserImage: Boolean(userImageUri),
            hasReadyToPrintFile: Boolean(readyPrintUploadedFile?.url),
            customization: savedCustomizationDraft,
          },
          previewImage: previewDataUri,
          dimensions: { width: canvasW, height: canvasH },
        });
        if (!savedDesign?._id) {
          throw new Error('Design save returned no id.');
        }
        return savedDesign._id;
      } catch (e: any) {
        throw new Error(e?.serverMessage || e?.message || 'Failed to save your customized design.');
      }
    },
    [passedDesignId, canvasH, canvasW, flowType, productCanvasConfig.mask, productCanvasConfig.printArea, productId, productName, readyPrintUploadedFile?.url, savedCustomizationDraft, textLayers, userImageUri],
  );

  const persistBusinessPrintConfigOrThrow = useCallback(
    async (designId: string, previewDataUri?: string): Promise<string | undefined> => {
      if (flowType !== 'printing') return undefined;
      if (businessDeliveryMethod === 'pickup' && !selectedPickupShopId) {
        throw new Error('Please select a pickup location.');
      }
      if (businessDeliveryMethod === 'delivery' && !businessServicePackage) {
        throw new Error('Please select a delivery package.');
      }

      const payload = {
        productId,
        productName,
        businessPrintType: businessPrintType || inferBusinessPrintType(productName),
        designType: businessDesignType,
        designId,
        previewImage: previewDataUri,
        readyToPrintFile: readyPrintUploadedFile,
        selectedOptions: {
          size: selectedSize,
          paperType: selectedBase,
          finish: selectedInterior,
          sides: businessSides,
        },
        quantity: businessQuantity,
        unitPrice,
        totalPrice,
        deliveryMethod: businessDeliveryMethod,
        shopId: businessDeliveryMethod === 'pickup' ? selectedPickupShopId : undefined,
        servicePackage: businessDeliveryMethod === 'delivery' ? businessServicePackage : '',
      };

      const savedConfig = await productsApi.saveBusinessPrintConfig(payload);
      const configId = savedConfig?._id || savedConfig?.configId;
      if (!configId) {
        throw new Error('Business print configuration could not be saved.');
      }
      return configId;
    },
    [
      businessDeliveryMethod,
      businessDesignType,
      businessPrintType,
      businessQuantity,
      businessServicePackage,
      businessSides,
      flowType,
      productId,
      productName,
      selectedBase,
      selectedInterior,
      selectedPickupShopId,
      selectedSize,
      totalPrice,
      unitPrice,
    ],
  );

  const handleBuyNow = useCallback(async () => {
    if (!stockState.inStock) {
      Alert.alert('Out of stock', stockState.message || 'This product is currently unavailable.');
      return;
    }
    try {
      const { imageUri, previewDataUri } = await captureDesignSnapshot();
      const designId = await persistDesignOrThrow(previewDataUri);
      const businessPrintConfigId = await persistBusinessPrintConfigOrThrow(designId, previewDataUri);
      addItem({
        id: `custom-${flowType}-${productId}-${Date.now()}`,
        backendProductId: productId,
        designId,
        businessPrintConfigId,
        businessConfigDraft:
          flowType === 'printing'
            ? {
                quantity: businessQuantity,
                deliveryMethod: businessDeliveryMethod,
                shopId: businessDeliveryMethod === 'pickup' ? selectedPickupShopId : undefined,
                servicePackage: businessDeliveryMethod === 'delivery' ? businessServicePackage : '',
                designType: businessDesignType,
                selectedOptions: {
                  size: selectedSize,
                  paperType: selectedBase,
                  finish: selectedInterior,
                  sides: businessSides,
                },
                readyToPrintFile: readyPrintUploadedFile || undefined,
              }
            : undefined,
        readyToPrintFile: readyPrintUploadedFile || undefined,
        type: 'product',
        flowType,
        quantity: flowType === 'printing' ? businessQuantity : 1,
        price: unitPrice,
        name: `${productName} - Custom (${selectedSize})`,
        image: imageUri,
      });
      const parentNav = navigation.getParent();
      if (parentNav) {
        (parentNav as any).navigate('CartTab', { screen: 'Cart' });
      } else {
        (navigation as any).navigate('CartTab', { screen: 'Cart' });
      }
    } catch (e: any) {
      Alert.alert('Design Save Failed', e?.message || 'Please try again.');
    }
  }, [addItem, businessDeliveryMethod, businessDesignType, businessQuantity, businessServicePackage, businessSides, captureDesignSnapshot, navigation, persistBusinessPrintConfigOrThrow, persistDesignOrThrow, productId, flowType, readyPrintUploadedFile, selectedBase, selectedInterior, selectedPickupShopId, selectedSize, unitPrice, productName, stockState]);

  const handleAddToCart = useCallback(async () => {
    if (!stockState.inStock) {
      Alert.alert('Out of stock', stockState.message || 'This product is currently unavailable.');
      return;
    }
    try {
      const { imageUri, previewDataUri } = await captureDesignSnapshot();
      const designId = await persistDesignOrThrow(previewDataUri);
      const businessPrintConfigId = await persistBusinessPrintConfigOrThrow(designId, previewDataUri);
      addItem({
        id: `custom-${flowType}-${productId}-${Date.now()}`,
        backendProductId: productId,
        designId,
        businessPrintConfigId,
        businessConfigDraft:
          flowType === 'printing'
            ? {
                quantity: businessQuantity,
                deliveryMethod: businessDeliveryMethod,
                shopId: businessDeliveryMethod === 'pickup' ? selectedPickupShopId : undefined,
                servicePackage: businessDeliveryMethod === 'delivery' ? businessServicePackage : '',
                designType: businessDesignType,
                selectedOptions: {
                  size: selectedSize,
                  paperType: selectedBase,
                  finish: selectedInterior,
                  sides: businessSides,
                },
                readyToPrintFile: readyPrintUploadedFile || undefined,
              }
            : undefined,
        readyToPrintFile: readyPrintUploadedFile || undefined,
        type: 'product',
        flowType,
        quantity: flowType === 'printing' ? businessQuantity : 1,
        price: unitPrice,
        name: `${productName} - Custom (${selectedSize})`,
        image: imageUri,
      });
      Alert.alert('Added to Cart', 'Your customized design has been added to cart.');
    } catch (e: any) {
      Alert.alert('Design Save Failed', e?.message || 'Please try again.');
    }
  }, [addItem, businessDeliveryMethod, businessDesignType, businessQuantity, businessServicePackage, businessSides, captureDesignSnapshot, persistBusinessPrintConfigOrThrow, persistDesignOrThrow, productId, flowType, readyPrintUploadedFile, selectedBase, selectedInterior, selectedPickupShopId, selectedSize, unitPrice, productName, stockState]);

  return (
    <SafeScreen>
      {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity style={styles.headerSlot} onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeft size={24} color={t.iconDefault} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Customize</Text>
          <View style={styles.headerSlot} />
        </View>

      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={!isAreaHandleDragging && !isTextDragging}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        nestedScrollEnabled
      >
        {/* Product Preview + Skia Canvas */}
        <View style={styles.canvasSection}>
          <Text style={[styles.productLabel, { color: t.textPrimary }]} numberOfLines={1}>
            {productName}
          </Text>

          {loadingImage ? (
            <View style={[styles.loadingWrap, { height: canvasH, backgroundColor: t.chipBg, borderRadius: 16 }]}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={[styles.loadingText, { color: t.textSecondary }]}>Loading product...</Text>
            </View>
          ) : !canvasReady ? (
            <View style={[styles.loadingWrap, { height: canvasH, backgroundColor: t.chipBg, borderRadius: 16 }]}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={[styles.loadingText, { color: t.textSecondary }]}>Optimizing preview...</Text>
            </View>
          ) : !canvasLayoutReady ? (
            <View style={[styles.loadingWrap, { height: canvasH, backgroundColor: t.chipBg, borderRadius: 16 }]}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={[styles.loadingText, { color: t.textSecondary }]}>Preparing preview...</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.canvasHint, { color: t.textSecondary }]}>
                {showPrintAreaEditor
                  ? 'Drag corner handles for area. Drag side/top/bottom shape handles for curve/edges.'
                  : userImageUri
                  ? 'Auto-fitted to product. Optional pinch to zoom. Drag to reposition.'
                  : `Tap "Upload Photo" - your image will fit the ${(productCanvasConfig.printArea.label ?? 'print area').toLowerCase()}`}
              </Text>

              <View style={[styles.canvasFrame, { backgroundColor: t.chipBg }]}>
                <View ref={previewCaptureRef} collapsable={false} style={{ width: canvasW, height: canvasH }}>
                  <SkiaProductCanvas
                    key={`skia-canvas-${canvasResetVersion}`}
                    ref={skiaCanvasRef}
                    productImageUri={resolvedImage}
                    userImageUri={userImageUri}
                    productNaturalSize={productNaturalSize}
                    width={canvasW}
                    height={canvasH}
                    productConfig={productCanvasConfig}
                    backgroundColor={t.chipBg}
                    accentColor={accentColor}
                    interactionEnabled={!showPrintAreaEditor && !isTextDragging}
                  />
                  {showPrintAreaEditor && (
                    <View style={styles.areaEditorLayer} pointerEvents="box-none">
                      <View
                        pointerEvents="none"
                        style={[
                          styles.areaEditorRect,
                          {
                            left: editablePrintRect.x,
                            top: editablePrintRect.y,
                            width: editablePrintRect.w,
                            height: editablePrintRect.h,
                            borderColor: accentColor,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.areaEditorHandle,
                          {
                            left: editablePrintRect.x - 11,
                            top: editablePrintRect.y - 11,
                            borderColor: accentColor,
                            backgroundColor: t.background,
                          },
                        ]}
                        {...cornerResponders.tl.panHandlers}
                      />
                      <View
                        style={[
                          styles.areaEditorHandle,
                          {
                            left: editablePrintRect.x + editablePrintRect.w - 11,
                            top: editablePrintRect.y - 11,
                            borderColor: accentColor,
                            backgroundColor: t.background,
                          },
                        ]}
                        {...cornerResponders.tr.panHandlers}
                      />
                      <View
                        style={[
                          styles.areaEditorHandle,
                          {
                            left: editablePrintRect.x - 11,
                            top: editablePrintRect.y + editablePrintRect.h - 11,
                            borderColor: accentColor,
                            backgroundColor: t.background,
                          },
                        ]}
                        {...cornerResponders.bl.panHandlers}
                      />
                      <View
                        style={[
                          styles.areaEditorHandle,
                          {
                            left: editablePrintRect.x + editablePrintRect.w - 11,
                            top: editablePrintRect.y + editablePrintRect.h - 11,
                            borderColor: accentColor,
                            backgroundColor: t.background,
                          },
                        ]}
                        {...cornerResponders.br.panHandlers}
                      />

                      {/* Hand-only curve controls (no +/- buttons) */}
                      {productCanvasConfig.mask.kind === 'barrel' && (
                        <>
                          <View
                            style={[
                              styles.areaShapeHandle,
                              {
                                left: barrelHandlePositions.top.x - 10,
                                top: barrelHandlePositions.top.y - 10,
                                borderColor: accentColor,
                                backgroundColor: t.background,
                              },
                            ]}
                            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                            {...barrelResponders.topArc.panHandlers}
                          />
                          <View
                            style={[
                              styles.areaShapeHandle,
                              {
                                left: barrelHandlePositions.bottom.x - 10,
                                top: barrelHandlePositions.bottom.y - 10,
                                borderColor: accentColor,
                                backgroundColor: t.background,
                              },
                            ]}
                            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                            {...barrelResponders.bottomArc.panHandlers}
                          />
                          <View
                            style={[
                              styles.areaShapeHandle,
                              {
                                left: barrelHandlePositions.depth.x - 10,
                                top: barrelHandlePositions.depth.y - 10,
                                borderColor: accentColor,
                                backgroundColor: t.background,
                              },
                            ]}
                            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                            {...barrelResponders.depth.panHandlers}
                          />
                        </>
                      )}

                      {(productCanvasConfig.mask.kind === 'rect' || productCanvasConfig.mask.kind === 'roundedRect') && (
                        <View
                          style={[
                            styles.areaShapeHandle,
                            {
                              left: editablePrintRect.x + editablePrintRect.w - 10,
                              top: editablePrintRect.y + 10,
                              borderColor: accentColor,
                              backgroundColor: t.background,
                            },
                          ]}
                          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          {...cornerRadiusResponder.panHandlers}
                        />
                      )}
                    </View>
                  )}

                  <View style={styles.textOverlayLayer} pointerEvents="box-none">
                    {textLayers.map((layer) => {
                      const selected = selectedTextId === layer.id;
                      return (
                        <View
                          key={layer.id}
                          style={[
                            styles.textLayerWrap,
                            {
                              left: layer.x,
                              top: layer.y,
                              borderColor: selected ? accentColor : 'transparent',
                            },
                          ]}
                          {...getTextPanResponder(layer.id).panHandlers}
                        >
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => handleSelectTextLayer(layer.id)}
                            style={styles.textLayerTap}
                          >
                            <Text style={[styles.textLayerText, { color: layer.color }]}>{layer.text}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={[styles.toolSection, { borderColor: t.border, backgroundColor: t.card }]}>
                <Text style={[styles.toolSectionTitle, { color: t.textPrimary }]}>Photo tools</Text>
                <View style={styles.canvasActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.canvasActionBtn,
                      { backgroundColor: accentColor, borderColor: accentColor },
                    ]}
                    onPress={pickUserImage}
                    activeOpacity={0.85}
                  >
                    <ImagePlus size={16} color="#FFFFFF" />
                    <Text style={[styles.canvasActionText, { color: '#FFFFFF' }]}>
                      {userImageUri ? 'Change Photo' : 'Upload Photo'}
                    </Text>
                  </TouchableOpacity>

                  {userImageUri && (
                    <TouchableOpacity
                      style={[
                        styles.canvasActionBtn,
                        { backgroundColor: 'transparent', borderColor: t.border },
                      ]}
                      onPress={handleResetTransforms}
                      activeOpacity={0.85}
                    >
                      <RotateCcw size={16} color={t.textPrimary} />
                      <Text style={[styles.canvasActionText, { color: t.textPrimary }]}>Reset Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={[styles.toolSection, { borderColor: t.border, backgroundColor: t.card }]}>
                <Text style={[styles.toolSectionTitle, { color: t.textPrimary }]}>Area tools</Text>
                <View style={styles.canvasActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.canvasActionBtn,
                      { backgroundColor: 'transparent', borderColor: showPrintAreaEditor ? accentColor : t.border },
                    ]}
                    onPress={toggleAreaEditor}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.canvasActionText, { color: showPrintAreaEditor ? accentColor : t.textPrimary }]}>
                      {showPrintAreaEditor ? 'Done Area' : 'Adjust Area'}
                    </Text>
                  </TouchableOpacity>

                  {manualPrintArea && (
                    <TouchableOpacity
                      style={[
                        styles.canvasActionBtn,
                        { backgroundColor: 'transparent', borderColor: t.border },
                      ]}
                      onPress={handleResetArea}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.canvasActionText, { color: t.textPrimary }]}>Reset Area</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={[styles.designUploadCard, { borderColor: t.border, backgroundColor: t.card }]}>
                <View style={styles.designUploadHeader}>
                  <View style={[styles.designUploadIconWrap, { backgroundColor: activeBg }]}>
                    <Upload size={18} color={accentColor} />
                  </View>
                  <View style={styles.designUploadMeta}>
                    <Text style={[styles.designUploadTitle, { color: t.textPrimary }]}>Ready-to-print file</Text>
                    <Text style={[styles.designUploadSub, { color: t.textSecondary }]}>
                      {readyPrintStatusText}
                    </Text>
                  </View>
                </View>
                <View style={styles.canvasActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.canvasActionBtn,
                      { backgroundColor: 'transparent', borderColor: accentColor },
                      uploadingReadyPrint && { opacity: 0.7 },
                    ]}
                    onPress={pickReadyPrintFile}
                    activeOpacity={0.85}
                    disabled={uploadingReadyPrint}
                  >
                    {uploadingReadyPrint ? (
                      <ActivityIndicator size="small" color={accentColor} />
                    ) : (
                      <Upload size={16} color={accentColor} />
                    )}
                    <Text style={[styles.canvasActionText, { color: accentColor }]}>
                      {readyPrintUploadedFile?.url ? 'Replace File' : 'Upload Design'}
                    </Text>
                  </TouchableOpacity>
                  {readyPrintUploadedFile?.url ? (
                    <TouchableOpacity
                      style={[
                        styles.canvasActionBtn,
                        { backgroundColor: 'transparent', borderColor: t.border },
                      ]}
                      onPress={clearReadyPrintFile}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.canvasActionText, { color: t.textPrimary }]}>Remove File</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={[styles.textEditorCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <Text style={[styles.textEditorTitle, { color: t.textPrimary }]}>Text Area</Text>
                <TextInput
                  value={textDraft}
                  onChangeText={setTextDraft}
                  placeholder="Type text and place it on product"
                  placeholderTextColor={t.placeholder}
                  style={[
                    styles.textInput,
                    { color: t.textPrimary, borderColor: t.border, backgroundColor: t.background },
                  ]}
                />
                <View style={styles.textColorRow}>
                  {TEXT_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setTextColor(color)}
                      style={[
                        styles.textColorDot,
                        { backgroundColor: color },
                        textColor === color && { borderColor: accentColor, borderWidth: 2.5 },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.canvasActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.canvasActionBtn,
                      { backgroundColor: accentColor, borderColor: accentColor },
                    ]}
                    onPress={handleAddOrUpdateText}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.canvasActionText, { color: '#FFFFFF' }]}>
                      {selectedTextId ? 'Update Text' : 'Add Text'}
                    </Text>
                  </TouchableOpacity>
                  {selectedTextId && (
                    <TouchableOpacity
                      style={[
                        styles.canvasActionBtn,
                        { backgroundColor: 'transparent', borderColor: t.border },
                      ]}
                      onPress={handleRemoveText}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.canvasActionText, { color: t.textPrimary }]}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            </>
          )}
        </View>

        {/* 1. SIZE */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionNumber, { color: t.textPrimary }]}>1. SIZE</Text>
            <Text style={[styles.sectionSubNote, { color: t.placeholder }]}>
              {selectedSize === 'standard' ? 'Standard selected' : 'Large selected'}
            </Text>
          </View>
          <View style={styles.sizeRowOuter}>
            {SIZE_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.sizeCard,
                  { borderColor: selectedSize === s.id ? accentColor : t.border },
                  selectedSize === s.id && { backgroundColor: activeBg },
                ]}
                onPress={() => setSelectedSize(s.id)}
              >
                <Package size={20} color={selectedSize === s.id ? accentColor : t.placeholder} />
                <Text style={[styles.sizeLabel, selectedSize === s.id ? { color: accentColor } : { color: t.textMuted }]}>
                  {s.label}
                </Text>
                <Text style={[styles.sizeSub, { color: t.placeholder }]}>{s.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 2. BASE COLOR */}
        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: t.textPrimary }]}>2. BASE COLOR</Text>
          <View style={styles.baseColorRow}>
            {BASE_COLORS.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedBase(c.id)}
                style={styles.baseColorItem}
              >
                <View
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c.color, borderColor: c.border || c.color },
                    selectedBase === c.id && [styles.colorCircleActive, { borderColor: accentColor }],
                  ]}
                />
                <Text style={[styles.baseColorLabel, { color: t.textSecondary }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. INTERIOR COLOR */}
        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: t.textPrimary }]}>3. INTERIOR COLOR</Text>
          <View style={styles.colorRow}>
            {INTERIOR_COLORS.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedInterior(c.id)}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c.color, borderColor: c.border || c.color },
                  selectedInterior === c.id && [styles.colorCircleActive, { borderColor: accentColor }],
                ]}
              />
            ))}
          </View>
        </View>

        {flowType === 'printing' ? (
          <View style={styles.section}>
            <Text style={[styles.sectionNumber, { color: t.textPrimary }]}>4. PRINTING OPTIONS</Text>

            <View style={styles.businessOptionBlock}>
              <Text style={[styles.optionLabel, { color: t.textSecondary }]}>Print side</Text>
              <View style={styles.inlineChipRow}>
                {BUSINESS_PRINT_SIDES.map((side) => {
                  const active = businessSides === side.id;
                  return (
                    <TouchableOpacity
                      key={side.id}
                      style={[
                        styles.inlineChip,
                        { borderColor: active ? accentColor : t.border, backgroundColor: active ? activeBg : t.card },
                      ]}
                      onPress={() => setBusinessSides(side.id)}
                    >
                      <Text style={[styles.inlineChipText, { color: active ? accentColor : t.textSecondary }]}>{side.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.businessOptionBlock}>
              <QuantityPicker label="Quantity" value={businessQuantity} onChange={setBusinessQuantity} min={1} max={999} />
            </View>

            <View style={styles.businessOptionBlock}>
              <Text style={[styles.optionLabel, { color: t.textSecondary }]}>Delivery method</Text>
              <View style={styles.inlineChipRow}>
                {(['delivery', 'pickup'] as const).map((method) => {
                  const active = businessDeliveryMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.inlineChip,
                        { borderColor: active ? accentColor : t.border, backgroundColor: active ? activeBg : t.card },
                      ]}
                      onPress={() => setBusinessDeliveryMethod(method)}
                    >
                      <Text style={[styles.inlineChipText, { color: active ? accentColor : t.textSecondary }]}>
                        {method === 'delivery' ? 'Delivery' : 'Pickup'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {businessDeliveryMethod === 'delivery' ? (
              <View style={styles.businessOptionBlock}>
                <Text style={[styles.optionLabel, { color: t.textSecondary }]}>Service package</Text>
                <View style={styles.packageListCompact}>
                  {servicePackages.map((pkg) => {
                    const active = businessServicePackage === pkg.id;
                    return (
                      <TouchableOpacity
                        key={pkg.id || pkg.label}
                        style={[
                          styles.packageCardCompact,
                          { borderColor: active ? accentColor : t.border, backgroundColor: active ? activeBg : t.card },
                        ]}
                        onPress={() => setBusinessServicePackage(pkg.id)}
                      >
                        <Text style={[styles.packageTitleCompact, { color: active ? accentColor : t.textPrimary }]}>{pkg.label}</Text>
                        {pkg.duration ? <Text style={[styles.packageSubCompact, { color: t.textSecondary }]}>{pkg.duration}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.businessOptionBlock}>
                <Text style={[styles.optionLabel, { color: t.textSecondary }]}>Pickup location</Text>
                {pickupLocationsLoading ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <View style={styles.packageListCompact}>
                    {pickupLocations.map((location) => {
                      const active = selectedPickupShopId === location.id;
                      return (
                        <TouchableOpacity
                          key={location.id}
                          style={[
                            styles.packageCardCompact,
                            { borderColor: active ? accentColor : t.border, backgroundColor: active ? activeBg : t.card },
                          ]}
                          onPress={() => setSelectedPickupShopId(location.id)}
                        >
                          <Text style={[styles.packageTitleCompact, { color: active ? accentColor : t.textPrimary }]} numberOfLines={1}>
                            {location.title}
                          </Text>
                          <Text style={[styles.packageSubCompact, { color: t.textSecondary }]} numberOfLines={2}>
                            {location.address}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        ) : null}

        {/* Design ready badge */}
        {!stockState.inStock && (
          <View style={[styles.designBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.designBadgeText, { color: '#B91C1C' }]}>
              {stockState.message || 'Out of stock'}
            </Text>
          </View>
        )}
        {userImageUri && (
          <View style={[styles.designBadge, { backgroundColor: activeBg }]}>
            <Text style={[styles.designBadgeText, { color: accentColor }]}>
              Photo applied. Ready to order
            </Text>
          </View>
        )}

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: t.textSecondary }]}>Total</Text>
          <Text style={[styles.priceValue, { color: t.textPrimary }]}>{`\u20B9${flowType === 'printing' ? totalPrice : unitPrice}`}</Text>
        </View>

        {/* Buy Now */}
        <TouchableOpacity
          style={[styles.buyNowBtn, { backgroundColor: t.textPrimary }, (exporting || !stockState.inStock) && { opacity: 0.6 }]}
          onPress={handleBuyNow}
          activeOpacity={0.9}
          disabled={exporting || !stockState.inStock}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={t.background} style={{ marginRight: 8 }} />
          ) : (
            <ShoppingCart size={18} color={t.background} style={{ marginRight: 8 }} />
          )}
          <Text style={[styles.buyNowText, { color: t.background }]}>
            {exporting ? 'Preparing design...' : `Buy Now - \u20B9${flowType === 'printing' ? totalPrice : unitPrice}`}
          </Text>
        </TouchableOpacity>

        {/* Add to Cart */}
        <TouchableOpacity
          style={[styles.addToCartBtn, { borderColor: t.textPrimary }, (exporting || !stockState.inStock) && { opacity: 0.6 }]}
          onPress={handleAddToCart}
          activeOpacity={0.9}
          disabled={exporting || !stockState.inStock}
        >
          <Text style={[styles.addToCartText, { color: t.textPrimary }]}>
            {exporting ? 'Preparing design...' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 6,
    paddingBottom: 12,
    minHeight: 52,
    gap: 12,
  },
  headerSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#242424',
    flex: 1,
    textAlign: 'center',
    lineHeight: 24,
  },
  scroll: {
    paddingTop: 6,
    paddingBottom: 100,
  },
  canvasSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 20,
  },
  productLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 6,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
  },
  canvasHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },
  canvasFrame: {
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  areaEditorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  areaEditorRect: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  areaEditorHandle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  areaShapeHandle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  textOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  textLayerWrap: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  textLayerTap: {
    minHeight: 24,
    justifyContent: 'center',
  },
  textLayerText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 24,
  },
  canvasActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  toolSection: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    marginTop: 12,
  },
  toolSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  canvasActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  canvasActionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  textEditorCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    marginTop: 12,
  },
  designUploadCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    marginTop: 12,
  },
  designUploadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  designUploadIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  designUploadMeta: {
    flex: 1,
    gap: 4,
  },
  designUploadTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  designUploadSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  textEditorTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  textColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  textColorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionNumber: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  sectionSubNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  sizeRowOuter: {
    flexDirection: 'row',
    gap: 12,
  },
  sizeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 4,
  },
  sizeLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  sizeSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
  },
  baseColorRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  baseColorItem: {
    alignItems: 'center',
    gap: 6,
  },
  baseColorLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  colorCircleActive: {
    borderWidth: 3,
  },
  businessOptionBlock: {
    marginTop: 10,
    gap: 8,
  },
  optionLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  inlineChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inlineChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inlineChipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  packageListCompact: {
    gap: 10,
  },
  packageCardCompact: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  packageTitleCompact: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  packageSubCompact: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  designBadge: {
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  designBadgeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  priceLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  priceValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
  },
  buyNowBtn: {
    marginHorizontal: Spacing.lg,
    backgroundColor: '#000000',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  buyNowText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  addToCartBtn: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addToCartText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
});

