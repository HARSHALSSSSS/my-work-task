import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronUp, ChevronDown, CloudUpload, Minus, Plus } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/useCartStore';
import { useThemeStore } from '../../store/useThemeStore';
import { CartItem, PrintConfig, PrintingSubService } from '../../types';
import * as productsApi from '../../api/products';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'StandardPrinting'>;
type Route = RouteProp<PrintStackParamList, 'StandardPrinting'>;

interface DropdownOption { label: string; value: string }

type PricingState = {
  basePrice: number;
  total: number;
  breakdown?: any;
};

const COLOR_MODES: DropdownOption[] = [
  { label: 'B&W', value: 'bw' },
  { label: 'color', value: 'color' },
  { label: 'Custom', value: 'custom' },
];
const PAGE_SIZES: DropdownOption[] = [
  { label: 'A4', value: 'A4' },
  { label: 'A3', value: 'A3' },
];
const A4_ONLY_PAGE_SIZES: DropdownOption[] = [
  { label: 'A4', value: 'A4' },
];
const PRINT_SIDES: DropdownOption[] = [
  { label: 'one-sided', value: 'one-sided' },
  { label: 'Two-sided', value: 'two-sided' },
  { label: '4 in 1 (2 front+2 back)', value: '4-in-1' },
];
const PRINT_SIDES_NO_4IN1: DropdownOption[] = [
  { label: 'one-sided', value: 'one-sided' },
  { label: 'Two-sided', value: 'two-sided' },
];
const THESIS_PRINT_SIDES: DropdownOption[] = [
  { label: 'one-sided', value: 'one-sided' },
];
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
  { label: 'Need', value: 'need' },
  { label: 'No need', value: 'no-need' },
];
const COVER_PAGES: DropdownOption[] = [
  { label: 'Transparent Sheet', value: 'transparent' },
  { label: 'Blue Color Cover', value: 'blue' },
  { label: 'Pink Color Cover', value: 'pink' },
  { label: 'Print 1st page of the PDF on a blue cover page', value: 'blue-print' },
  { label: 'Print 1st page of the PDF on a pink cover page', value: 'pink-print' },
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

function DropdownSelector({
  label, options, selected, onSelect, isOpen, onToggle,
}: {
  label: string; options: DropdownOption[];
  selected: string; onSelect: (v: string) => void;
  isOpen: boolean; onToggle: () => void;
}) {
  const { colors: t } = useThemeStore();
  const selectedOpt = options.find((o) => o.value === selected);
  return (
    <View style={styles.dropdownSection}>
      <Text style={[styles.dropdownLabel, { color: t.textPrimary }]}>{label}</Text>
      <TouchableOpacity style={[styles.dropdownTrigger, { borderBottomColor: t.border }]} onPress={onToggle} activeOpacity={0.8}>
        <Text style={[styles.dropdownTriggerText, { color: t.placeholder }, selectedOpt && [styles.dropdownTriggerSelected, { color: t.textMuted }]]}>
          {selectedOpt ? selectedOpt.label : 'Select Input'}
        </Text>
        {isOpen ? <ChevronUp size={18} color={t.textSecondary} /> : <ChevronDown size={18} color={t.textSecondary} />}
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.optionsList}>
          {options.map((opt) => {
            const active = opt.value === selected;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.optionItem}
                onPress={() => { onSelect(opt.value); onToggle(); }}
              >
                <Text style={[styles.optionText, { color: t.textMuted }, active && [styles.optionTextActive, { color: t.textPrimary }]]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function CounterRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { colors: t } = useThemeStore();
  return (
    <View style={styles.counterRow}>
      <Text style={[styles.counterLabel, { color: t.textPrimary }]}>{label}</Text>
      <View style={styles.counterControls}>
        <TouchableOpacity
          style={[styles.counterBtn, styles.counterBtnMinus]}
          onPress={() => onChange(Math.max(0, value - 1))}
        >
          <Minus size={14} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.counterValue, { color: t.textPrimary }]}>{String(value).padStart(2, '0')}</Text>
        <TouchableOpacity
          style={[styles.counterBtn, styles.counterBtnPlus]}
          onPress={() => onChange(value + 1)}
        >
          <Plus size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const StandardPrintingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const subService = params.subService;
  const deliveryMode = params.deliveryMode || 'delivery';
  const locationId = params.locationId;
  const selectedServicePackage = params.servicePackage || 'standard';
  const backendPrintType = PRINT_TYPE_BY_SUB_SERVICE[subService];
  const addItem = useCartStore((s) => s.addItem);
  const { colors: t } = useThemeStore();

  const [fileName, setFileName] = useState<string | undefined>();
  const [fileUri, setFileUri] = useState<string | undefined>();
  const [fileMime, setFileMime] = useState<string | undefined>();
  const [uploadedFile, setUploadedFile] = useState<productsApi.UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pricing, setPricing] = useState<PricingState | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [colorMode, setColorMode] = useState('bw');
  const [pageSize, setPageSize] = useState('A4');
  const [printSide, setPrintSide] = useState('one-sided');
  const [printType, setPrintType] = useState('loose');
  const [bindingCover, setBindingCover] = useState('');
  const [cdOption, setCdOption] = useState('');
  const [coverPage, setCoverPage] = useState('');
  const [copies, setCopies] = useState(1);
  const [linearGraph, setLinearGraph] = useState(0);
  const [semiLogGraph, setSemiLogGraph] = useState(0);
  const [instructions, setInstructions] = useState('');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = useCallback((key: string) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  }, []);

  const buildConfigPayload = useCallback((file?: productsApi.UploadedFile | null, priceOnly = false) => {
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
    if (backendPrintType === 'soft_binding') {
      basePayload.coverPage = COVER_PAGE_MAP[coverPage] || 'transparent_sheet';
    }
    if (backendPrintType === 'thesis_binding') {
      basePayload.bindingCover = BINDING_COVER_MAP[bindingCover] || 'black_gold';
      basePayload.cdRequired = cdOption === 'need' ? 'need' : 'no_need';
    }

    return basePayload;
  }, [
    backendPrintType,
    bindingCover,
    cdOption,
    colorMode,
    copies,
    coverPage,
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
  ]);

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
      console.log('[upload] picked asset', {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
      });
      if (!isSupportedUpload(asset.name, asset.mimeType)) {
        Alert.alert('Unsupported file', 'Please upload PDF, DOC, DOCX, JPG, or PNG only.');
        return;
      }
      let resolvedUri = asset.uri;
      if (resolvedUri.startsWith('content://')) {
        const safeName = String(asset.name || 'upload')
          .replace(/[^ -]/g, '')
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
      console.log('[upload] resolved uri', resolvedUri);
      setFileUri(resolvedUri);
      setFileName(asset.name ?? 'Selected file');
      setFileMime(asset.mimeType || undefined);
      setUploadedFile(null);

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
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!uploadedFile?.url) {
      setPricing(null);
      setPricingLoading(false);
      return () => { cancelled = true; };
    }
    setPricingLoading(true);
    const body = buildConfigPayload(uploadedFile, true);
    productsApi
      .savePrintConfig(body)
      .then((res) => {
        if (cancelled) return;
        setPricing(resolvePricing(res));
      })
      .catch(() => { if (!cancelled) setPricing(null); })
      .finally(() => { if (!cancelled) setPricingLoading(false); });
    return () => { cancelled = true; };
  }, [buildConfigPayload, uploadedFile]);

  const handleAddToCart = useCallback(async () => {
    if (submitting) return;
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

      const resolvedPricing = resolvePricing(saved);
      const serverTotal = resolvedPricing?.total ?? pricing?.total;
      if (serverTotal === null || serverTotal === undefined) {
        Alert.alert('Pricing unavailable', 'We could not fetch the price from the server. Please retry.');
        return;
      }

      const id = `print-${subService}-${Date.now()}`;
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
        fileName: finalUploaded?.name || fileName,
      };

      const item: CartItem = {
        id,
        type: 'printing',
        quantity: 1,
        price: serverTotal,
        name: `${pageSize} Print \u2014 ${colorMode === 'bw' ? 'B&W' : 'Color'}`,
        printConfig,
        printConfigId: saved?._id || saved?.configId,
        image: finalUploaded?.url,
      };
      addItem(item);
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  }, [addItem, buildConfigPayload, colorMode, copies, deliveryMode, fileMime, fileName, fileUri, linearGraph, locationId, navigation, pageSize, pricing, printSide, printType, selectedServicePackage, semiLogGraph, subService, submitting, uploadedFile]);

  const renderDropdowns = () => {
    switch (subService) {
      case 'thesis':
        return (
          <>
            <DropdownSelector
              label="Color Mode" options={COLOR_MODES}
              selected={colorMode} onSelect={setColorMode}
              isOpen={openDropdown === 'color'} onToggle={() => toggleDropdown('color')}
            />
            <DropdownSelector
              label="Print Side" options={THESIS_PRINT_SIDES}
              selected={printSide} onSelect={setPrintSide}
              isOpen={openDropdown === 'side'} onToggle={() => toggleDropdown('side')}
            />
            <DropdownSelector
              label="Page size" options={A4_ONLY_PAGE_SIZES}
              selected={pageSize} onSelect={setPageSize}
              isOpen={openDropdown === 'page'} onToggle={() => toggleDropdown('page')}
            />
            <DropdownSelector
              label="Binding Cover" options={BINDING_COVERS}
              selected={bindingCover} onSelect={setBindingCover}
              isOpen={openDropdown === 'binding'} onToggle={() => toggleDropdown('binding')}
            />
            <DropdownSelector
              label="CD" options={CD_OPTIONS}
              selected={cdOption} onSelect={setCdOption}
              isOpen={openDropdown === 'cd'} onToggle={() => toggleDropdown('cd')}
            />
          </>
        );
      case 'spiral':
        return (
          <>
            <DropdownSelector
              label="Color Mode" options={COLOR_MODES}
              selected={colorMode} onSelect={setColorMode}
              isOpen={openDropdown === 'color'} onToggle={() => toggleDropdown('color')}
            />
            <DropdownSelector
              label="Page size" options={A4_ONLY_PAGE_SIZES}
              selected={pageSize} onSelect={setPageSize}
              isOpen={openDropdown === 'page'} onToggle={() => toggleDropdown('page')}
            />
            <DropdownSelector
              label="Print Side" options={PRINT_SIDES_NO_4IN1}
              selected={printSide} onSelect={setPrintSide}
              isOpen={openDropdown === 'side'} onToggle={() => toggleDropdown('side')}
            />
            <DropdownSelector
              label="Cover Page" options={COVER_PAGES}
              selected={coverPage} onSelect={setCoverPage}
              isOpen={openDropdown === 'coverPage'} onToggle={() => toggleDropdown('coverPage')}
            />
          </>
        );
      case 'soft':
        return (
          <>
            <DropdownSelector
              label="Color Mode" options={COLOR_MODES}
              selected={colorMode} onSelect={setColorMode}
              isOpen={openDropdown === 'color'} onToggle={() => toggleDropdown('color')}
            />
            <DropdownSelector
              label="Page size" options={A4_ONLY_PAGE_SIZES}
              selected={pageSize} onSelect={setPageSize}
              isOpen={openDropdown === 'page'} onToggle={() => toggleDropdown('page')}
            />
            <DropdownSelector
              label="Print Side" options={PRINT_SIDES}
              selected={printSide} onSelect={setPrintSide}
              isOpen={openDropdown === 'side'} onToggle={() => toggleDropdown('side')}
            />
            <DropdownSelector
              label="Cover Page" options={COVER_PAGES}
              selected={coverPage} onSelect={setCoverPage}
              isOpen={openDropdown === 'coverPage'} onToggle={() => toggleDropdown('coverPage')}
            />
          </>
        );
      default:
        return (
          <>
            <DropdownSelector
              label="Color Mode" options={COLOR_MODES}
              selected={colorMode} onSelect={setColorMode}
              isOpen={openDropdown === 'color'} onToggle={() => toggleDropdown('color')}
            />
            <DropdownSelector
              label="Page size" options={PAGE_SIZES}
              selected={pageSize} onSelect={setPageSize}
              isOpen={openDropdown === 'page'} onToggle={() => toggleDropdown('page')}
            />
            <DropdownSelector
              label="Print Side" options={PRINT_SIDES}
              selected={printSide} onSelect={setPrintSide}
              isOpen={openDropdown === 'side'} onToggle={() => toggleDropdown('side')}
            />
            <DropdownSelector
              label="Print Type" options={PRINT_TYPES}
              selected={printType} onSelect={setPrintType}
              isOpen={openDropdown === 'type'} onToggle={() => toggleDropdown('type')}
            />
          </>
        );
    }
  };

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Printing</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Text style={[styles.heading, { color: t.textPrimary }]}>Print your documents</Text>
        <Text style={[styles.subheading, { color: t.textSecondary }]}>Select your document or image to get started</Text>

        {/* File Upload */}
        <TouchableOpacity style={styles.uploadBox} onPress={pickFile} activeOpacity={0.85} disabled={uploading}>
          <View style={[styles.uploadIconCircle, { backgroundColor: t.chipBg }]}>
            {uploading ? <ActivityIndicator color={t.textSecondary} /> : <CloudUpload size={28} color={t.textSecondary} />}
          </View>
          <Text style={[styles.uploadTitle, { color: t.textPrimary }]}>Select Files</Text>
          <Text style={[styles.uploadSub, { color: t.textSecondary }]}>
            {uploading ? 'Uploading to server\u2026' : uploadedFile ? `Uploaded${uploadedFile.pageCount ? ` \u2022 ${uploadedFile.pageCount} pages` : ''}` : 'Tap to browse PDF or image from the device'}
          </Text>
          <View style={[styles.chooseFileBtn, { backgroundColor: t.textPrimary }]}>
            <Text style={[styles.chooseFileText, { color: t.background }]}>{fileName || 'Choose File'}</Text>
          </View>
        </TouchableOpacity>

        {/* Dropdowns \u2014 order varies by sub-service */}
        {renderDropdowns()}

        {/* Number of copies */}
        <CounterRow label="Number of copies" value={copies} onChange={setCopies} />

        {subService !== 'thesis' && (
          <>
            <Text style={[styles.addonTitle, { color: t.textPrimary }]}>Addon's</Text>
            <CounterRow label="Linear Graph Sheets" value={linearGraph} onChange={setLinearGraph} />
            <CounterRow label="Semi Log Graph sheets" value={semiLogGraph} onChange={setSemiLogGraph} />
          </>
        )}

        {/* Special Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={[styles.dropdownLabel, { color: t.textPrimary }]}>Special Instructions</Text>
          <TextInput
            style={[styles.instructionsInput, { borderBottomColor: t.border, color: t.textPrimary }]}
            placeholder="Type your instruction here"
            placeholderTextColor={t.placeholder}
            value={instructions}
            onChangeText={setInstructions}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* About */}
        <View style={styles.aboutSection}>
          <Text style={[styles.aboutTitle, { color: t.textPrimary }]}>About the Service</Text>
          <Text style={[styles.aboutLabel, { color: t.textMuted }]}>
            Instant Printing (within one hour)
          </Text>
          <Text style={[styles.aboutBody, { color: t.textSecondary }]}>
            Get your documents printed quickly and professionally with SpeedCopy. We offer high-quality black & white or color printing on 70 GSM paper, ideal for everyday use \u2014 from assignments and reports to official documents.
          </Text>
          <Text style={[styles.aboutBody, { color: t.textSecondary }]}>
            {'\u2022'} Sharp, clear prints on standard A4 size{'\n'}
            {'\u2022'} Available 70 GSM paper for smooth handling{'\n'}
            {'\u2022'} Upload PDFs or images directly in the app{'\n'}
            {'\u2022'} Fast turnaround & doorstep delivery (if available){'\n'}
            Print smart. Print fast. Only with SpeedCopy.
          </Text>
        </View>

        {/* Price */}
        <View style={[styles.priceSection, { backgroundColor: t.card }]}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabelGreen}>Base Price</Text>
            {pricingLoading ? (
              <ActivityIndicator size="small" color={t.textPrimary} />
            ) : (
              <Text style={[styles.priceValue, { color: t.textPrimary }]}>{pricing ? `\u20B9${pricing.basePrice}` : '\u2014'}</Text>
            )}
          </View>
          <View style={[styles.priceDivider, { backgroundColor: t.divider }]} />
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: t.textPrimary }]}>Total payable</Text>
            <View style={styles.totalWrap}>
              {pricingLoading ? (
                <ActivityIndicator size="small" color={t.textPrimary} />
              ) : (
                <Text style={[styles.totalValue, { color: t.textPrimary }]}>{pricing ? `\u20B9${pricing.total}` : '\u2014'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Add to Cart */}
        <TouchableOpacity
          style={[styles.addToCartBtn, { backgroundColor: t.textPrimary }, (submitting || uploading || !pricing || !uploadedFile?.url) && { opacity: 0.6 }]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
          disabled={submitting || uploading || !pricing || !uploadedFile?.url}
        >
          {submitting ? (
            <ActivityIndicator color={t.background} />
          ) : (
            <Text style={[styles.addToCartText, { color: t.background }]}>Add to Cart</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: '#242424',
    textAlign: 'center',
  },
  scroll: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  heading: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: '#000',
  },
  subheading: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: '#6B6B6B',
    marginBottom: 20,
    marginTop: 2,
  },

  uploadBox: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
    gap: 6,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#000',
  },
  uploadSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 18,
  },
  chooseFileBtn: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  chooseFileText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFF',
  },

  dropdownSection: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: '#000',
    marginBottom: 6,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 10,
  },
  dropdownTriggerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#A5A5A5',
  },
  dropdownTriggerSelected: {
    color: '#424242',
  },
  optionsList: {
    paddingTop: 6,
    paddingLeft: 4,
  },
  optionItem: {
    paddingVertical: 8,
  },
  optionText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#424242',
  },
  optionTextActive: {
    fontFamily: 'Poppins_700Bold',
    color: '#000',
  },

  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  counterLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: '#000',
    flex: 1,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnMinus: {
    backgroundColor: '#EB5757',
  },
  counterBtnPlus: {
    backgroundColor: '#27AE60',
  },
  counterValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#000',
    minWidth: 24,
    textAlign: 'center',
  },

  addonTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: '#000',
    marginBottom: 12,
    marginTop: 4,
  },

  instructionsSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  instructionsInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#000',
    paddingVertical: 10,
    minHeight: 44,
  },

  aboutSection: {
    marginBottom: 20,
    gap: 6,
  },
  aboutTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#000',
  },
  aboutLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#424242',
  },
  aboutBody: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 17,
    color: '#6B6B6B',
  },

  priceSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabelGreen: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#27AE60',
  },
  priceValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#000',
  },
  priceValueDiscount: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#EB5757',
  },
  discountHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: '#27AE60',
    marginTop: 1,
  },
  priceDivider: {
    height: 0.5,
    backgroundColor: '#E0E0E0',
  },
  totalLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#000',
  },
  totalWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#000',
  },
  totalOld: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#A5A5A5',
    textDecorationLine: 'line-through',
  },

  addToCartBtn: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addToCartText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
});

