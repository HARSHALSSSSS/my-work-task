import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronUp, ChevronDown, CloudUpload, FileText, Maximize2, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/useCartStore';
import { useThemeStore } from '../../store/useThemeStore';
import { CartItem, PrintConfig, PrintingSubService } from '../../types';
import * as productsApi from '../../api/products';
import { QuantityPicker } from '../../components/ui/QuantityPicker';
import { Input } from '../../components/ui/Input';
import { Colors, Radii, Spacing, Typography } from '../../constants/theme';
import { toAbsoluteAssetUrl } from '../../utils/product';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'StandardPrinting'>;
type Route = RouteProp<PrintStackParamList, 'StandardPrinting'>;

interface DropdownOption {
  label: string;
  value: string;
}

type PricingState = {
  basePrice: number;
  total: number;
  breakdown?: any;
};

const COLOR_MODES: DropdownOption[] = [
  { label: 'B&W', value: 'bw' },
  { label: 'Color', value: 'color' },
  { label: 'Custom', value: 'custom' },
];

const PAGE_SIZES: DropdownOption[] = [
  { label: 'A4', value: 'A4' },
  { label: 'A3', value: 'A3' },
];

const A4_ONLY_PAGE_SIZES: DropdownOption[] = [{ label: 'A4', value: 'A4' }];

const PRINT_SIDES: DropdownOption[] = [
  { label: 'One-sided', value: 'one-sided' },
  { label: 'Two-sided', value: 'two-sided' },
  { label: '4 in 1 (2 front + 2 back)', value: '4-in-1' },
];

const PRINT_SIDES_NO_4IN1: DropdownOption[] = [
  { label: 'One-sided', value: 'one-sided' },
  { label: 'Two-sided', value: 'two-sided' },
];

const THESIS_PRINT_SIDES: DropdownOption[] = [{ label: 'One-sided', value: 'one-sided' }];

const PRINT_TYPES: DropdownOption[] = [
  { label: 'Loose paper', value: 'loose' },
  { label: 'Stapled', value: 'stapled' },
];

const BINDING_COVERS: DropdownOption[] = [
  { label: 'Black & Gold', value: 'black-gold' },
  { label: 'Silver', value: 'silver' },
  { label: 'Silver with side strip', value: 'silver-strip' },
  { label: 'Black & Gold with side strip', value: 'black-gold-strip' },
];

const CD_OPTIONS: DropdownOption[] = [
  { label: 'Need CD', value: 'need' },
  { label: 'No CD needed', value: 'no-need' },
];

const COVER_PAGES: DropdownOption[] = [
  { label: 'Transparent Sheet', value: 'transparent' },
  { label: 'Blue Color Cover', value: 'blue' },
  { label: 'Pink Color Cover', value: 'pink' },
  { label: 'Print 1st page on blue cover', value: 'blue-print' },
  { label: 'Print 1st page on pink cover', value: 'pink-print' },
];

type BackendPrintType = 'standard_printing' | 'spiral_binding' | 'soft_binding' | 'thesis_binding';

const PRINT_TYPE_BY_SUB_SERVICE: Record<PrintingSubService, BackendPrintType> = {
  standard: 'standard_printing',
  spiral: 'spiral_binding',
  soft: 'soft_binding',
  thesis: 'thesis_binding',
};

const PRINT_SIDE_MAP: Record<string, 'one_sided' | 'two_sided' | '4in1'> = {
  'one-sided': 'one_sided',
  'two-sided': 'two_sided',
  '4-in-1': '4in1',
};

const OUTPUT_TYPE_MAP: Record<string, 'loose_paper' | 'stapled'> = {
  loose: 'loose_paper',
  stapled: 'stapled',
};

const BINDING_COVER_MAP: Record<string, 'black_gold' | 'silver' | 'silver_side_strip' | 'black_gold_side_strip'> = {
  'black-gold': 'black_gold',
  silver: 'silver',
  'silver-strip': 'silver_side_strip',
  'black-gold-strip': 'black_gold_side_strip',
};

const COVER_PAGE_MAP: Record<string, 'transparent_sheet' | 'blue_cover' | 'pink_cover' | 'print_blue_cover' | 'print_pink_cover'> = {
  transparent: 'transparent_sheet',
  blue: 'blue_cover',
  pink: 'pink_cover',
  'blue-print': 'print_blue_cover',
  'pink-print': 'print_pink_cover',
};

const SUPPORTED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

const SUPPORTED_UPLOAD_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);

function getExtension(name?: string): string {
  const value = String(name || '');
  const idx = value.lastIndexOf('.');
  if (idx < 0) return '';
  return value.slice(idx + 1).toLowerCase();
}

function isSupportedUpload(name?: string, mimeType?: string | null): boolean {
  const normalizedMime = String(mimeType || '').toLowerCase();
  if (normalizedMime && SUPPORTED_UPLOAD_MIME_TYPES.has(normalizedMime)) return true;
  const ext = getExtension(name);
  return Boolean(ext && SUPPORTED_UPLOAD_EXTENSIONS.has(ext));
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function resolvePricing(payload: any): PricingState | null {
  const estimated = toNumber(payload?.estimatedPrice);
  const pricedTotal =
    toNumber(payload?.pricing?.total)
    ?? toNumber(payload?.total)
    ?? toNumber(payload?.totalPrice)
    ?? toNumber(payload?.price)
    ?? estimated
    ?? toNumber(payload?.basePrice);

  if (pricedTotal === null) return null;

  return {
    basePrice: estimated ?? pricedTotal,
    total: pricedTotal,
    breakdown: payload?.pricing || payload,
  };
}

function isImageLikeFile(name?: string, uri?: string) {
  const source = `${name || ''} ${uri || ''}`.toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp'].some((ext) => source.includes(ext));
}

type PreviewKind = 'image' | 'pdf' | 'doc' | 'unknown';

function resolvePreviewKind(name?: string, mimeType?: string, uri?: string): PreviewKind {
  if (isImageLikeFile(name, uri)) return 'image';

  const ext = getExtension(name || uri);
  const normalizedMime = String(mimeType || '').toLowerCase();
  if (normalizedMime.includes('pdf') || ext === 'pdf') return 'pdf';
  if (normalizedMime.includes('msword') || normalizedMime.includes('wordprocessingml') || ext === 'doc' || ext === 'docx') {
    return 'doc';
  }

  return 'unknown';
}

function normalizePreviewUri(uri?: string): string {
  const raw = String(uri || '').trim();
  if (!raw) return '';
  if (/^(https?:|file:|content:|data:)/i.test(raw)) return raw;
  if (raw.startsWith('/')) return `file://${raw}`;
  return raw;
}

function isRemoteHttpUrl(uri?: string): boolean {
  return /^https?:\/\//i.test(String(uri || '').trim());
}

function resolveEmbeddedPreviewUri(uri?: string, kind: PreviewKind): string {
  const normalized = normalizePreviewUri(uri);
  if (!normalized) return '';
  if (!isRemoteHttpUrl(normalized)) {
    return kind === 'pdf' ? normalized : '';
  }
  if (kind === 'pdf') {
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(normalized)}`;
  }
  if (kind === 'doc') {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}

function resolveUploadedFilePreviewUri(file?: productsApi.UploadedFile | null): string {
  const previewCandidate = String(
    file?.previewImage
    || file?.thumbnailUrl
    || file?.previewUrl
    || '',
  ).trim();
  if (previewCandidate) return normalizePreviewUri(previewCandidate);

  const rawUrl = String(file?.url || '').trim();
  return isImageLikeFile(file?.name, rawUrl) ? normalizePreviewUri(rawUrl) : '';
}

function resolvePreviewImageUri(file?: productsApi.UploadedFile | null, localUri?: string, kind?: PreviewKind): string {
  const backendImage = resolveUploadedFilePreviewUri(file);
  if (backendImage) return normalizePreviewUri(backendImage);
  if (kind === 'image') return normalizePreviewUri(localUri || file?.url);
  return '';
}

function getPreviewStatusText(kind: PreviewKind, hasPreviewImage: boolean): string {
  if (hasPreviewImage) {
    if (kind === 'pdf') return 'Showing generated first-page preview.';
    if (kind === 'doc') return 'Showing generated document preview.';
    return 'Showing uploaded image preview.';
  }
  if (kind === 'pdf' || kind === 'doc') return '';
  return 'File ready for preview.';
}

function formatPreviewName(fileName?: string) {
  if (!fileName) return 'File ready for print';
  if (fileName.length <= 35) return fileName;
  return `${fileName.slice(0, 16)}…${fileName.slice(-14)}`;
}

function DropdownSelector({
  label,
  options,
  selected,
  onSelect,
  isOpen,
  onToggle,
}: {
  label: string;
  options: DropdownOption[];
  selected: string;
  onSelect: (v: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { colors: t } = useThemeStore();
  const selectedOpt = options.find((o) => o.value === selected);

  return (
    <View style={styles.dropdownSection}>
      <Text style={[styles.dropdownLabel, { color: t.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdownTrigger, { borderColor: t.border, backgroundColor: t.card }]}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <Text style={[styles.dropdownTriggerText, { color: selectedOpt ? t.textPrimary : t.placeholder }]}>
          {selectedOpt ? selectedOpt.label : 'Select option'}
        </Text>
        {isOpen ? <ChevronUp size={18} color={t.textSecondary} /> : <ChevronDown size={18} color={t.textSecondary} />}
      </TouchableOpacity>

      {isOpen ? (
        <View style={[styles.optionsList, { borderColor: t.border, backgroundColor: t.card }]}> 
          {options.map((opt) => {
            const active = opt.value === selected;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionItem, { borderBottomColor: t.divider }]}
                onPress={() => {
                  onSelect(opt.value);
                  onToggle();
                }}
              >
              <Text style={[styles.optionText, { color: active ? t.textPrimary : t.textMuted }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export const StandardPrintingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { params } = route;
  const subService = params.subService;
  const deliveryMode = params.deliveryMode || 'delivery';
  const locationId = params.locationId;
  const selectedServicePackage = params.servicePackage || 'standard';
  const backendPrintType = PRINT_TYPE_BY_SUB_SERVICE[subService];
  const addItem = useCartStore((s) => s.addItem);
  const { colors: t } = useThemeStore();

  const [fileName, setFileName] = useState<string | undefined>(params.initialFileName);
  const [fileUri, setFileUri] = useState<string | undefined>(params.initialFileUri);
  const [fileMime, setFileMime] = useState<string | undefined>(params.initialFileMime);
  const [uploadedFile, setUploadedFile] = useState<productsApi.UploadedFile | null>(params.initialUploadedFile || null);
  const [uploading, setUploading] = useState(false);
  const [pricing, setPricing] = useState<PricingState | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [colorMode, setColorMode] = useState(params.initialColorMode || 'bw');
  const [pageSize, setPageSize] = useState(params.initialPageSize || 'A4');
  const [printSide, setPrintSide] = useState(params.initialPrintSide || 'one-sided');
  const [printType, setPrintType] = useState(params.initialPrintType || 'loose');
  const [bindingCover, setBindingCover] = useState(params.initialBindingCover || 'black-gold');
  const [cdOption, setCdOption] = useState(params.initialCdOption || 'no-need');
  const [coverPage, setCoverPage] = useState(params.initialCoverPage || 'transparent');
  const [copies, setCopies] = useState(params.initialCopies || 1);
  const [linearGraph, setLinearGraph] = useState(params.initialLinearGraph || 0);
  const [semiLogGraph, setSemiLogGraph] = useState(params.initialSemiLogGraph || 0);
  const [instructions, setInstructions] = useState(params.initialInstructions || '');
  const [customColorDescription, setCustomColorDescription] = useState(params.customColorDescription || '');
  const [thesisSpineText, setThesisSpineText] = useState(params.initialThesisSpineText || '');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showSecondaryDetails, setShowSecondaryDetails] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);

  const showThesisSpineText = subService === 'thesis' && bindingCover.includes('strip');
  const previewUri = uploadedFile?.url ? toAbsoluteAssetUrl(uploadedFile.url) : fileUri;
  const previewFileName = fileName || uploadedFile?.name;
  const previewMimeType = fileMime || uploadedFile?.mimeType;
  const previewKind = resolvePreviewKind(previewFileName, previewMimeType, previewUri);
  const previewImageUri = resolvePreviewImageUri(uploadedFile, fileUri, previewKind);
  const previewDisplayUri = normalizePreviewUri(previewUri);
  const embeddedPreviewUri = resolveEmbeddedPreviewUri(previewDisplayUri, previewKind);
  const hasImagePreview = Boolean(previewImageUri);
  const canOpenPreviewModal = Boolean(previewImageUri || embeddedPreviewUri || previewDisplayUri) && (previewKind === 'image' || previewKind === 'pdf' || previewKind === 'doc');
  const serviceTitle = `${subService.charAt(0).toUpperCase()}${subService.slice(1)} Printing`;
  const hasSecondaryValues = Boolean(instructions.trim() || linearGraph > 0 || semiLogGraph > 0);

  const toggleDropdown = useCallback((key: string) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  }, []);

  useEffect(() => {
    if (hasSecondaryValues) setShowSecondaryDetails(true);
  }, [hasSecondaryValues]);

  useEffect(() => {
    if (!canOpenPreviewModal) setPreviewModalVisible(false);
  }, [canOpenPreviewModal]);

  useEffect(() => {
    setPreviewLoadFailed(false);
  }, [previewDisplayUri, previewImageUri, embeddedPreviewUri]);

  useEffect(() => {
    if (typeof params.customColorDescription === 'string') {
      setCustomColorDescription(params.customColorDescription);
    }
  }, [params.customColorDescription]);

  useEffect(() => {
    if (!params.initialUploadedFile?.url && !params.initialFileUri && !params.initialFileName) return;
    if (params.initialFileName) setFileName(params.initialFileName);
    if (params.initialFileUri) setFileUri(params.initialFileUri);
    if (params.initialFileMime) setFileMime(params.initialFileMime);
    if (params.initialUploadedFile?.url) setUploadedFile(params.initialUploadedFile as productsApi.UploadedFile);
    if (params.initialColorMode) setColorMode(params.initialColorMode);
    if (params.initialPageSize) setPageSize(params.initialPageSize);
    if (params.initialPrintSide) setPrintSide(params.initialPrintSide);
    if (params.initialPrintType) setPrintType(params.initialPrintType);
    if (params.initialBindingCover) setBindingCover(params.initialBindingCover);
    if (params.initialCdOption) setCdOption(params.initialCdOption);
    if (params.initialCoverPage) setCoverPage(params.initialCoverPage);
    if (typeof params.initialCopies === 'number') setCopies(params.initialCopies);
    if (typeof params.initialLinearGraph === 'number') setLinearGraph(params.initialLinearGraph);
    if (typeof params.initialSemiLogGraph === 'number') setSemiLogGraph(params.initialSemiLogGraph);
    if (typeof params.initialInstructions === 'string') setInstructions(params.initialInstructions);
    if (typeof params.initialThesisSpineText === 'string') setThesisSpineText(params.initialThesisSpineText);
  }, [
    params.initialUploadedFile,
    params.initialFileUri,
    params.initialFileName,
    params.initialFileMime,
    params.initialColorMode,
    params.initialPageSize,
    params.initialPrintSide,
    params.initialPrintType,
    params.initialBindingCover,
    params.initialCdOption,
    params.initialCoverPage,
    params.initialCopies,
    params.initialLinearGraph,
    params.initialSemiLogGraph,
    params.initialInstructions,
    params.initialThesisSpineText,
  ]);

  const buildConfigPayload = useCallback(
    (file?: productsApi.UploadedFile | null, priceOnly = false) => {
      const printSideValue = PRINT_SIDE_MAP[printSide] || 'one_sided';
      const basePayload: Record<string, any> = {
        printType: backendPrintType,
        files: file?.url
          ? [{
            originalName: file.name || fileName || 'uploaded-file',
            url: file.url,
            publicId: file._id || undefined,
            size: file.size,
            pages: file.pageCount,
            mimeType: file.mimeType,
          }]
          : [],
        colorMode,
        colorModeNotes: colorMode === 'custom' ? customColorDescription.trim() : undefined,
        pageSize: String(pageSize || 'A4').toLowerCase(),
        printSide: printSideValue,
        copies,
        linearGraphSheets: linearGraph,
        semiLogGraphSheets: semiLogGraph,
        specialInstructions: instructions.trim(),
        deliveryMethod: deliveryMode,
        servicePackage: deliveryMode === 'delivery' ? selectedServicePackage : '',
        shopId: deliveryMode === 'pickup' ? locationId : undefined,
        priceOnly,
      };

      if (backendPrintType === 'standard_printing') {
        basePayload.printOutputType = OUTPUT_TYPE_MAP[printType] || 'loose_paper';
      }
      if (backendPrintType === 'soft_binding' || backendPrintType === 'spiral_binding') {
        basePayload.coverPage = COVER_PAGE_MAP[coverPage] || 'transparent_sheet';
      }
      if (backendPrintType === 'thesis_binding') {
        basePayload.bindingCover = BINDING_COVER_MAP[bindingCover] || 'black_gold';
        basePayload.cdRequired = cdOption === 'need' ? 'need' : 'no_need';
        basePayload.thesisSpineText = showThesisSpineText ? thesisSpineText.trim() : undefined;
      }

      return basePayload;
    },
    [
      backendPrintType,
      bindingCover,
      cdOption,
      colorMode,
      copies,
      coverPage,
      customColorDescription,
      deliveryMode,
      fileName,
      instructions,
      linearGraph,
      locationId,
      pageSize,
      printSide,
      printType,
      selectedServicePackage,
      semiLogGraph,
      showThesisSpineText,
      thesisSpineText,
    ],
  );

  const pickFile = useCallback(async () => {
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
      if (!asset) return;
      if (!isSupportedUpload(asset.name, asset.mimeType)) {
        Alert.alert('Unsupported file', 'Please upload PDF, DOC, DOCX, JPG, or PNG only.');
        return;
      }

      let resolvedUri = asset.uri;
      if (resolvedUri.startsWith('content://')) {
        const safeName = String(asset.name || 'upload')
          .replace(/[^\w.\-]/g, '_')
          .replace(/_+/g, '_');
        const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (baseDir) {
          const uploadDir = `${baseDir}uploads/`;
          await FileSystem.makeDirectoryAsync(uploadDir, { intermediates: true });
          const target = `${uploadDir}${Date.now()}-${safeName || 'upload'}`;
          await FileSystem.copyAsync({ from: resolvedUri, to: target });
          resolvedUri = target;
        }
      }

      setFileUri(resolvedUri);
      setFileName(asset.name ?? 'Selected file');
      setFileMime(asset.mimeType || undefined);
      setUploadedFile(null);
      setPreviewModalVisible(false);

      setUploading(true);
      try {
        const uploaded = await productsApi.uploadPrintingFile({
          uri: resolvedUri,
          name: asset.name ?? 'file',
          mimeType: asset.mimeType,
        });
        setUploadedFile(uploaded);
      } catch (e: any) {
        Alert.alert('Upload failed', e?.serverMessage || e?.response?.data?.message || e?.message || 'Could not upload file. Please try another file.');
        setUploadedFile(null);
      } finally {
        setUploading(false);
      }
    } catch {
      setUploading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!uploadedFile?.url) {
      setPricing(null);
      setPricingLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setPricingLoading(true);
    const body = buildConfigPayload(uploadedFile, true);
    productsApi
      .savePrintConfig(body)
      .then((res) => {
        if (cancelled) return;
        setPricing(resolvePricing(res));
      })
      .catch(() => {
        if (!cancelled) setPricing(null);
      })
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buildConfigPayload, uploadedFile]);

  const validateBeforeSubmit = () => {
    if (!uploadedFile?.url) {
      Alert.alert('File required', 'Please upload your document before adding this print job.');
      return false;
    }
    if (colorMode === 'custom' && !customColorDescription.trim()) {
      Alert.alert('Custom request needed', 'Please add custom color requirements.');
      return false;
    }
    if (showThesisSpineText && !thesisSpineText.trim()) {
      Alert.alert('Strip text required', 'Please enter side-strip text for this thesis cover option.');
      return false;
    }
    return true;
  };

  const handleAddToCart = useCallback(async () => {
    if (submitting || !validateBeforeSubmit()) return;

    setSubmitting(true);
    try {
      let finalUploaded = uploadedFile;
      if (!finalUploaded && fileUri && fileName) {
        try {
          finalUploaded = await productsApi.uploadPrintingFile({ uri: fileUri, name: fileName, mimeType: fileMime });
          setUploadedFile(finalUploaded);
        } catch (e: any) {
          Alert.alert('Upload failed', e?.serverMessage || e?.message || 'Please re-select the file.');
          return;
        }
      }

      if (!finalUploaded?.url) {
        Alert.alert('File required', 'Please upload your document before adding this print job.');
        return;
      }

      const configBody = buildConfigPayload(finalUploaded, false);
      let saved: any = null;

      try {
        saved = await productsApi.savePrintConfig(configBody);
      } catch (e: any) {
        Alert.alert('Could not save configuration', e?.serverMessage || e?.message || 'Please try again.');
        return;
      }

      const resolved = resolvePricing(saved);
      const serverTotal = resolved?.total ?? pricing?.total;
      if (serverTotal === null || serverTotal === undefined) {
        Alert.alert('Pricing unavailable', 'We could not fetch the price from the server. Please retry.');
        return;
      }

      const printConfig: PrintConfig = {
        serviceType: subService,
        deliveryMethod: deliveryMode,
        shopId: locationId,
        servicePackage: deliveryMode === 'delivery' ? selectedServicePackage : undefined,
        colorMode: colorMode as PrintConfig['colorMode'],
        pageSize: pageSize as PrintConfig['pageSize'],
        printSide: printSide as PrintConfig['printSide'],
        printType: printType as PrintConfig['printType'],
        copies,
        addons: { linearGraph, semiLogGraph },
        specialInstructions: instructions.trim(),
        fileUri,
        fileName: finalUploaded.name || fileName,
        fileMime,
        uploadedFile: {
          _id: finalUploaded._id,
          url: finalUploaded.url,
          name: finalUploaded.name,
          mimeType: finalUploaded.mimeType,
          size: finalUploaded.size,
          pageCount: finalUploaded.pageCount,
          previewImage: finalUploaded.previewImage,
          thumbnailUrl: finalUploaded.thumbnailUrl,
          previewUrl: finalUploaded.previewUrl,
        },
        coverPage,
        bindingCover,
        cdOption,
        thesisSpineText: showThesisSpineText ? thesisSpineText.trim() : undefined,
        customColorDescription: colorMode === 'custom' ? customColorDescription.trim() : undefined,
      };

      const item: CartItem = {
        id: `print-${subService}-${Date.now()}`,
        type: 'printing',
        quantity: 1,
        price: serverTotal,
        name: `${serviceTitle} - ${pageSize} (${colorMode === 'bw' ? 'B&W' : colorMode === 'color' ? 'Color' : 'Custom'})`,
        printConfig,
        printConfigId: saved?._id || saved?.configId,
        image: resolveUploadedFilePreviewUri(finalUploaded) || finalUploaded.url,
      };

      addItem(item);
      const parent = navigation.getParent();
      if (parent) {
        (parent as any).navigate('CartTab', { screen: 'Cart' });
      } else {
        navigation.goBack();
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    addItem,
    bindingCover,
    buildConfigPayload,
    colorMode,
    copies,
    customColorDescription,
    deliveryMode,
    fileMime,
    fileName,
    fileUri,
    linearGraph,
    locationId,
    navigation,
    pageSize,
    pricing?.total,
    printSide,
    printType,
    selectedServicePackage,
    semiLogGraph,
    serviceTitle,
    showThesisSpineText,
    subService,
    submitting,
    thesisSpineText,
    uploadedFile,
  ]);

  const renderDropdowns = () => {
    switch (subService) {
      case 'thesis':
        return (
          <>
            <DropdownSelector
              label="Color Mode"
              options={COLOR_MODES}
              selected={colorMode}
              onSelect={setColorMode}
              isOpen={openDropdown === 'color'}
              onToggle={() => toggleDropdown('color')}
            />
            <DropdownSelector
              label="Print Side"
              options={THESIS_PRINT_SIDES}
              selected={printSide}
              onSelect={setPrintSide}
              isOpen={openDropdown === 'side'}
              onToggle={() => toggleDropdown('side')}
            />
            <DropdownSelector
              label="Page Size"
              options={A4_ONLY_PAGE_SIZES}
              selected={pageSize}
              onSelect={setPageSize}
              isOpen={openDropdown === 'page'}
              onToggle={() => toggleDropdown('page')}
            />
            <DropdownSelector
              label="Binding Cover"
              options={BINDING_COVERS}
              selected={bindingCover}
              onSelect={setBindingCover}
              isOpen={openDropdown === 'binding'}
              onToggle={() => toggleDropdown('binding')}
            />
            <DropdownSelector
              label="CD"
              options={CD_OPTIONS}
              selected={cdOption}
              onSelect={setCdOption}
              isOpen={openDropdown === 'cd'}
              onToggle={() => toggleDropdown('cd')}
            />
          </>
        );
      case 'spiral':
        return (
          <>
            <DropdownSelector
              label="Color Mode"
              options={COLOR_MODES}
              selected={colorMode}
              onSelect={setColorMode}
              isOpen={openDropdown === 'color'}
              onToggle={() => toggleDropdown('color')}
            />
            <DropdownSelector
              label="Page Size"
              options={A4_ONLY_PAGE_SIZES}
              selected={pageSize}
              onSelect={setPageSize}
              isOpen={openDropdown === 'page'}
              onToggle={() => toggleDropdown('page')}
            />
            <DropdownSelector
              label="Print Side"
              options={PRINT_SIDES_NO_4IN1}
              selected={printSide}
              onSelect={setPrintSide}
              isOpen={openDropdown === 'side'}
              onToggle={() => toggleDropdown('side')}
            />
            <DropdownSelector
              label="Cover Page"
              options={COVER_PAGES}
              selected={coverPage}
              onSelect={setCoverPage}
              isOpen={openDropdown === 'coverPage'}
              onToggle={() => toggleDropdown('coverPage')}
            />
          </>
        );
      case 'soft':
        return (
          <>
            <DropdownSelector
              label="Color Mode"
              options={COLOR_MODES}
              selected={colorMode}
              onSelect={setColorMode}
              isOpen={openDropdown === 'color'}
              onToggle={() => toggleDropdown('color')}
            />
            <DropdownSelector
              label="Page Size"
              options={A4_ONLY_PAGE_SIZES}
              selected={pageSize}
              onSelect={setPageSize}
              isOpen={openDropdown === 'page'}
              onToggle={() => toggleDropdown('page')}
            />
            <DropdownSelector
              label="Print Side"
              options={PRINT_SIDES}
              selected={printSide}
              onSelect={setPrintSide}
              isOpen={openDropdown === 'side'}
              onToggle={() => toggleDropdown('side')}
            />
            <DropdownSelector
              label="Cover Page"
              options={COVER_PAGES}
              selected={coverPage}
              onSelect={setCoverPage}
              isOpen={openDropdown === 'coverPage'}
              onToggle={() => toggleDropdown('coverPage')}
            />
          </>
        );
      default:
        return (
          <>
            <DropdownSelector
              label="Color Mode"
              options={COLOR_MODES}
              selected={colorMode}
              onSelect={setColorMode}
              isOpen={openDropdown === 'color'}
              onToggle={() => toggleDropdown('color')}
            />
            <DropdownSelector
              label="Page Size"
              options={PAGE_SIZES}
              selected={pageSize}
              onSelect={setPageSize}
              isOpen={openDropdown === 'page'}
              onToggle={() => toggleDropdown('page')}
            />
            <DropdownSelector
              label="Print Side"
              options={PRINT_SIDES}
              selected={printSide}
              onSelect={setPrintSide}
              isOpen={openDropdown === 'side'}
              onToggle={() => toggleDropdown('side')}
            />
            <DropdownSelector
              label="Print Type"
              options={PRINT_TYPES}
              selected={printType}
              onSelect={setPrintType}
              isOpen={openDropdown === 'type'}
              onToggle={() => toggleDropdown('type')}
            />
          </>
        );
    }
  };

  const pricingLabel = useMemo(() => {
    if (!pricing) return '--';
    return `₹${pricing.total}`;
  }, [pricing]);

  const openCustomColorDescriptionScreen = useCallback(() => {
    navigation.navigate('CustomColorDescription', {
      description: customColorDescription,
      returnTo: 'StandardPrinting',
      returnRouteKey: route.key,
      subService,
      deliveryMode,
      locationId,
      servicePackage: selectedServicePackage,
    });
  }, [customColorDescription, deliveryMode, locationId, navigation, route.key, selectedServicePackage, subService]);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Printing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <Text style={[styles.heading, { color: t.textPrimary }]}>{serviceTitle}</Text>
        <Text style={[styles.subheading, { color: t.textSecondary }]}>Upload your file, configure options and proceed to cart.</Text>

        <TouchableOpacity
          style={[styles.uploadBox, { borderColor: t.border, backgroundColor: t.card }]}
          onPress={pickFile}
          activeOpacity={0.85}
          disabled={uploading}
        >
          <View style={[styles.uploadIconCircle, { backgroundColor: t.chipBg }]}> 
            {uploading ? <ActivityIndicator color={t.textPrimary} /> : <CloudUpload size={22} color={t.textSecondary} />}
          </View>
          <Text style={[styles.uploadTitle, { color: t.textPrimary }]}>{uploading ? 'Uploading…' : 'Upload document'}</Text>
          <Text style={[styles.uploadSub, { color: t.textSecondary }]}>
            {uploadedFile?.url
              ? `Uploaded${uploadedFile.pageCount ? ` • ${uploadedFile.pageCount} pages` : ''}`
              : 'Supports PDF, DOC, DOCX, JPG and PNG'}
          </Text>
          <View style={[styles.chooseFileBtn, { backgroundColor: t.textPrimary }]}>
            <Text style={[styles.chooseFileText, { color: t.background }]} numberOfLines={1}>
              {fileName || 'Choose file'}
            </Text>
          </View>
        </TouchableOpacity>

        {previewDisplayUri ? (
          <View style={[styles.previewBlock, { borderColor: t.border, backgroundColor: t.card }]}> 
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewTitle, { color: t.textPrimary }]}>Preview</Text>
              <TouchableOpacity
                style={[styles.fullScreenBtn, { borderColor: t.border, backgroundColor: t.inputBg }, !canOpenPreviewModal && styles.previewDisabled]}
                onPress={() => setPreviewModalVisible(true)}
                activeOpacity={0.85}
                disabled={!canOpenPreviewModal}
              >
                <Maximize2 size={14} color={t.textSecondary} />
                <Text style={[styles.fullScreenText, { color: t.textSecondary }]}>Full screen</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.previewBody, { backgroundColor: t.chipBg }, !canOpenPreviewModal && styles.previewDisabled]}
              onPress={() => setPreviewModalVisible(true)}
              activeOpacity={0.9}
              disabled={!canOpenPreviewModal}
            >
              {hasImagePreview ? (
                <Image source={{ uri: previewImageUri }} resizeMode="cover" style={styles.previewImage} />
              ) : (
                <View style={styles.previewFallback}>
                  <FileText size={22} color={t.iconDefault} />
                  {getPreviewStatusText(previewKind, hasImagePreview) ? (
                    <Text style={[styles.previewFallbackText, { color: t.textSecondary }]}>
                      {getPreviewStatusText(previewKind, hasImagePreview)}
                    </Text>
                  ) : null}
                  <Text style={[styles.previewHint, { color: t.textMuted }]}>Tap to open</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.previewMeta, { color: t.textSecondary }]}>{formatPreviewName(previewFileName)}</Text>
          </View>
        ) : null}

        <View style={[styles.configCard, { borderColor: t.border, backgroundColor: t.card }]}>
          {renderDropdowns()}

          {colorMode === 'custom' ? (
            <TouchableOpacity
              style={[styles.customDescriptionCard, { borderColor: t.border, backgroundColor: t.inputBg }]}
              onPress={openCustomColorDescriptionScreen}
              activeOpacity={0.85}
            >
              <Text style={[styles.customDescriptionLabel, { color: t.textSecondary }]}>Custom color request</Text>
              <Text
                style={[
                  styles.customDescriptionValue,
                  { color: customColorDescription.trim() ? t.textPrimary : t.placeholder },
                ]}
              >
                {customColorDescription.trim()
                  ? customColorDescription.trim()
                  : 'Tap to describe the custom color split, pages or combinations'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {showThesisSpineText ? (
            <Input
              label="Thesis side-strip text"
              placeholder="Example: MBA Dissertation 2026"
              value={thesisSpineText}
              onChangeText={setThesisSpineText}
            />
          ) : null}

          <View style={styles.spacedBlock}>
            <QuantityPicker label="Number of copies" value={copies} onChange={setCopies} min={1} max={999} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.secondaryToggle, { borderColor: t.border, backgroundColor: t.card }]}
          onPress={() => setShowSecondaryDetails((prev) => !prev)}
          activeOpacity={0.85}
        >
          <Text style={[styles.secondaryToggleText, { color: t.textPrimary }]}>Additional instructions & add-ons</Text>
          {showSecondaryDetails ? <ChevronUp size={18} color={t.textSecondary} /> : <ChevronDown size={18} color={t.textSecondary} />}
        </TouchableOpacity>

        {showSecondaryDetails ? (
          <View style={[styles.secondaryBlock, { borderColor: t.border, backgroundColor: t.card }]}> 
            <View style={styles.instructionsSection}>
              <Text style={[styles.dropdownLabel, { color: t.textSecondary }]}>Special instructions</Text>
              <TextInput
                style={[styles.instructionsInput, { borderColor: t.border, color: t.textPrimary, backgroundColor: t.inputBg }]}
                placeholder="Any notes for print operator"
                placeholderTextColor={t.placeholder}
                value={instructions}
                onChangeText={setInstructions}
                multiline
                textAlignVertical="top"
              />
            </View>

            {subService !== 'thesis' ? (
              <>
                <Text style={[styles.addonTitle, { color: t.textPrimary }]}>Add-ons</Text>
                <View style={styles.spacedBlock}>
                  <QuantityPicker label="Linear graph sheets" value={linearGraph} onChange={setLinearGraph} min={0} max={150} />
                </View>
                <View style={styles.spacedBlock}>
                  <QuantityPicker label="Semi-log graph sheets" value={semiLogGraph} onChange={setSemiLogGraph} min={0} max={150} />
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.priceSection, { backgroundColor: t.card, borderColor: t.border }]}> 
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: Colors.green }]}>Base price</Text>
            {pricingLoading ? <ActivityIndicator size="small" color={t.textPrimary} /> : <Text style={[styles.priceValue, { color: t.textPrimary }]}>{pricing ? `₹${pricing.basePrice}` : '--'}</Text>}
          </View>
          <View style={[styles.priceDivider, { backgroundColor: t.divider }]} />
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: t.textPrimary }]}>Total payable</Text>
            {pricingLoading ? <ActivityIndicator size="small" color={t.textPrimary} /> : <Text style={[styles.totalValue, { color: t.textPrimary }]}>{pricingLabel}</Text>}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addToCartBtn, { backgroundColor: t.textPrimary }, (submitting || uploading || !pricing || !uploadedFile?.url) && styles.disabledBtn]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
          disabled={submitting || uploading || !pricing || !uploadedFile?.url}
        >
          {submitting ? (
            <ActivityIndicator color={t.background} />
          ) : (
            <Text style={[styles.addToCartText, { color: t.background }]}>Proceed to cart</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={previewModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <Pressable style={styles.previewModalBackdrop} onPress={() => setPreviewModalVisible(false)}>
          <Pressable style={[styles.previewModalCard, { backgroundColor: t.card }]} onPress={() => {}}>
            <View style={[styles.previewModalHeader, { borderBottomColor: t.border }]}> 
              <Text style={[styles.previewModalTitle, { color: t.textPrimary }]} numberOfLines={1}>
                {formatPreviewName(previewFileName)}
              </Text>
              <TouchableOpacity
                style={[styles.previewModalCloseBtn, { borderColor: t.border, backgroundColor: t.inputBg }]}
                onPress={() => setPreviewModalVisible(false)}
              >
                <X size={18} color={t.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.previewModalBody, { backgroundColor: t.chipBg }]}> 
              {hasImagePreview ? (
                <Image source={{ uri: previewImageUri }} resizeMode="contain" style={styles.previewModalImage} />
              ) : embeddedPreviewUri && !previewLoadFailed ? (
                <WebView
                  source={{ uri: embeddedPreviewUri }}
                  style={styles.previewWebview}
                  startInLoadingState
                  onError={() => setPreviewLoadFailed(true)}
                  onHttpError={() => setPreviewLoadFailed(true)}
                  setSupportMultipleWindows={false}
                  allowsBackForwardNavigationGestures={false}
                  renderLoading={() => (
                    <View style={styles.previewModalLoader}>
                      <ActivityIndicator size="large" color={t.textPrimary} />
                    </View>
                  )}
                />
              ) : (
                <View style={styles.previewModalFallback}> 
                  <FileText size={28} color={t.iconDefault} />
                  <Text style={[styles.previewModalFallbackText, { color: t.textSecondary }]}>
                    {previewKind === 'pdf'
                      ? 'A generated first-page image is not available yet for this PDF.'
                      : previewKind === 'doc'
                        ? 'A generated first-page image is not available yet for this DOC/DOCX.'
                        : 'Preview unavailable for this file path.'}
                  </Text>
                  {previewDisplayUri ? (
                    <TouchableOpacity
                      style={[styles.openFileBtn, { backgroundColor: t.textPrimary }]}
                      onPress={() => {
                        if (!previewDisplayUri) return;
                        Linking.openURL(previewDisplayUri).catch(() => null);
                      }}
                    >
                      <Text style={[styles.openFileText, { color: t.background }]}>Open file</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.title,
    textAlign: 'center',
  },
  headerSpacer: { width: 24 },
  scroll: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  heading: {
    ...Typography.h3,
  },
  subheading: {
    ...Typography.bodySm,
    marginBottom: Spacing.md,
    marginTop: Spacing.xxs,
  },
  uploadBox: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.section,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxs,
  },
  uploadTitle: {
    ...Typography.bodyBold,
  },
  uploadSub: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.md,
  },
  chooseFileBtn: {
    borderRadius: Radii.button,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    maxWidth: '88%',
  },
  chooseFileText: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
  },
  previewBlock: {
    borderWidth: 1,
    borderRadius: Radii.section,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  previewTitle: {
    ...Typography.subtitle,
    flex: 1,
  },
  fullScreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fullScreenText: {
    ...Typography.small,
  },
  previewBody: {
    borderRadius: Radii.small,
    overflow: 'hidden',
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  previewFallbackText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  previewHint: {
    ...Typography.small,
  },
  previewMeta: {
    ...Typography.small,
  },
  previewDisabled: {
    opacity: 0.52,
  },
  configCard: {
    borderWidth: 1,
    borderRadius: Radii.section,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  customDescriptionCard: {
    borderWidth: 1,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xxs,
  },
  customDescriptionLabel: {
    ...Typography.subtitle,
  },
  customDescriptionValue: {
    ...Typography.body,
    minHeight: 42,
  },
  dropdownSection: {
    marginBottom: Spacing.sm,
  },
  dropdownLabel: {
    ...Typography.subtitle,
    marginBottom: Spacing.xs,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  dropdownTriggerText: {
    ...Typography.body,
    flex: 1,
    marginRight: Spacing.sm,
  },
  optionsList: {
    borderWidth: 1,
    borderRadius: Radii.input,
    marginTop: 6,
    overflow: 'hidden',
  },
  optionItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    ...Typography.body,
  },
  spacedBlock: {
    marginBottom: Spacing.xs,
  },
  secondaryToggle: {
    borderWidth: 1,
    borderRadius: Radii.section,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  secondaryToggleText: {
    ...Typography.bodyBold,
    flex: 1,
  },
  secondaryBlock: {
    borderWidth: 1,
    borderRadius: Radii.section,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  addonTitle: {
    ...Typography.subtitle,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  instructionsSection: {
    marginBottom: Spacing.sm,
  },
  instructionsInput: {
    borderWidth: 1,
    borderRadius: Radii.input,
    ...Typography.body,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 72,
  },
  priceSection: {
    borderRadius: Radii.section,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    ...Typography.bodyBold,
  },
  priceValue: {
    ...Typography.bodyBold,
  },
  priceDivider: {
    height: StyleSheet.hairlineWidth,
  },
  totalLabel: {
    ...Typography.subtitle,
    fontFamily: 'Poppins_600SemiBold',
  },
  totalValue: {
    ...Typography.subtitle,
    fontFamily: 'Poppins_700Bold',
  },
  addToCartBtn: {
    borderRadius: Radii.button,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  addToCartText: {
    ...Typography.bodyBold,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.58,
  },
  previewModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  previewModalCard: {
    flex: 1,
    borderRadius: Radii.section,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  previewModalTitle: {
    ...Typography.bodyBold,
    flex: 1,
  },
  previewModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalBody: {
    flex: 1,
  },
  previewModalImage: {
    width: '100%',
    height: '100%',
  },
  previewWebview: {
    flex: 1,
    width: '100%',
  },
  previewModalLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  previewModalFallbackText: {
    ...Typography.bodySm,
    textAlign: 'center',
  },
  openFileBtn: {
    marginTop: Spacing.xs,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  openFileText: {
    ...Typography.bodyBold,
  },
});
