import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronDown, Gift, RotateCw, Upload } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Spacing } from '../../constants/theme';
import { GiftStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/useCartStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { isLikelyMongoId } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { getLiveStockState, LiveStockState } from '../../utils/stock';

type Nav = NativeStackNavigationProp<GiftStackParamList, 'GiftCustomize'>;
type Route = RouteProp<GiftStackParamList, 'GiftCustomize'>;

const SIZE_OPTIONS = [
  { id: '11oz', label: '11oz', sub: 'Standard', icon: 'standard' },
  { id: '15oz', label: '15oz', sub: 'Large (+ â‚¹249)', icon: 'large' },
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

const FONT_OPTIONS = ['Manrope (Modern)', 'Roboto (Clean)', 'Playfair (Elegant)', 'Caveat (Handwritten)'];

export function GiftCustomizeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { productId } = route.params;
  const { colors: t, mode: themeMode } = useThemeStore();
  const addItem = useCartStore((s) => s.addItem);
  const [stockState, setStockState] = useState<LiveStockState>({ inStock: true, availableStock: null, message: '' });
  const [productName, setProductName] = useState('Customized Product');
  const [unitPrice, setUnitPrice] = useState(0);

  const [selectedSize, setSelectedSize] = useState('11oz');
  const [selectedBase, setSelectedBase] = useState('white');
  const [selectedInterior, setSelectedInterior] = useState('white');
  const [customText, setCustomText] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0]);
  const [showFontPicker, setShowFontPicker] = useState(false);

  React.useEffect(() => {
    if (!isLikelyMongoId(productId)) return;
    productsApi.getGiftingProduct(productId)
      .then((p) => {
        const pricing = resolveProductPricing(p);
        setProductName(p.name || 'Customized Product');
        setUnitPrice(pricing.price);
        setStockState(getLiveStockState(p, 1));
      })
      .catch(() => {});
  }, [productId]);

  const handleBuyNow = useCallback(() => {
    if (!stockState.inStock) return;
    addItem({
      id: `gift-custom-${productId}-${Date.now()}`,
      backendProductId: productId,
      type: 'product',
      flowType: 'gifting',
      quantity: 1,
      price: unitPrice,
      name: `${productName} (${selectedSize})`,
      image: '',
    });
    navigation.getParent()?.navigate('CartTab', { screen: 'Cart' });
  }, [addItem, navigation, productId, productName, selectedSize, stockState.inStock, unitPrice]);

  const handleAddToCart = useCallback(() => {
    if (!stockState.inStock) return;
    addItem({
      id: `gift-custom-${productId}-${Date.now()}`,
      backendProductId: productId,
      type: 'product',
      flowType: 'gifting',
      quantity: 1,
      price: unitPrice,
      name: `${productName} (${selectedSize})`,
      image: '',
    });
    Alert.alert('Added to cart', 'Customized mug added to your cart.');
  }, [addItem, productId, productName, selectedSize, stockState.inStock, unitPrice]);

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Customize</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {/* Preview */}
        <View style={[styles.previewWrap, { backgroundColor: t.chipBg }]}>
          <View style={styles.previewPlaceholder}>
            <Gift size={64} color={t.placeholder} />
          </View>
          <TouchableOpacity style={[styles.rotateBtn, { backgroundColor: t.card }]}>
            <RotateCw size={18} color={t.textSecondary} />
          </TouchableOpacity>
        </View>
        {!stockState.inStock ? (
          <Text style={styles.stockWarning}>{stockState.message || 'Out of stock'}</Text>
        ) : null}

        {/* 1. SIZE */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionNumber, { color: t.textPrimary }]}>1. SIZE</Text>
            <Text style={[styles.sectionSubNote, { color: t.placeholder }]}>
              {selectedSize === '11oz' ? 'Standard selected' : 'Large selected'}
            </Text>
          </View>
          <View style={styles.sizeRow}>
            {SIZE_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.sizeCard,
                  { borderColor: selectedSize === s.id ? '#0F766E' : t.border },
                  selectedSize === s.id && styles.sizeCardActive,
                  selectedSize === s.id && { backgroundColor: themeMode === 'dark' ? '#0F766E20' : '#F0FDFA' },
                ]}
                onPress={() => setSelectedSize(s.id)}
              >
                <Gift size={20} color={selectedSize === s.id ? '#0F766E' : t.placeholder} />
                <Text style={[styles.sizeLabel, selectedSize === s.id ? styles.sizeLabelActive : { color: t.textMuted }]}>
                  {s.label}
                </Text>
                <Text style={[styles.sizeSub, { color: t.placeholder }]}>{s.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 2. BASE COLOR */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionNumber, { color: t.textPrimary }]}>2. BASE COLOR</Text>
            <TouchableOpacity>
              <Text style={styles.seeMoreLink}>Soothe mix</Text>
            </TouchableOpacity>
          </View>
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
                    selectedBase === c.id && styles.colorCircleActive,
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
                  selectedInterior === c.id && styles.colorCircleActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* 4. PERSONALIZATION */}
        <View style={styles.section}>
          <Text style={[styles.sectionNumber, { color: t.textPrimary }]}>4. PERSONALIZATION</Text>
          <TextInput
            style={[styles.textInput, { borderColor: t.border, backgroundColor: t.inputBg, color: t.textPrimary }]}
            placeholder="Enter your text"
            placeholderTextColor={t.placeholder}
            value={customText}
            onChangeText={setCustomText}
          />
          <TouchableOpacity
            style={[styles.fontPicker, { borderColor: t.border, backgroundColor: t.inputBg }]}
            onPress={() => setShowFontPicker(!showFontPicker)}
          >
            <Text style={[styles.fontPickerText, { color: t.textPrimary }]}>{selectedFont}</Text>
            <ChevronDown size={18} color={t.textSecondary} />
          </TouchableOpacity>
          {showFontPicker && (
            <View style={[styles.fontDropdown, { borderColor: t.border, backgroundColor: t.card }]}>
              {FONT_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.fontOption, { borderBottomColor: t.divider }]}
                  onPress={() => {
                    setSelectedFont(f);
                    setShowFontPicker(false);
                  }}
                >
                  <Text style={[styles.fontOptionText, selectedFont === f ? styles.fontOptionActive : { color: t.textMuted }]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Upload Logo */}
        <TouchableOpacity style={[styles.uploadBox, { borderColor: t.border }]}>
          <Upload size={28} color={t.iconDefault} />
          <Text style={[styles.uploadTitle, { color: t.textPrimary }]}>Click to upload logo</Text>
          <Text style={[styles.uploadFormats, { color: t.placeholder }]}>SVG, PNG, JPG (MAX. 6MB)</Text>
        </TouchableOpacity>

        {/* Buy Now */}
        <TouchableOpacity style={[styles.buyNowBtn, { backgroundColor: t.textPrimary }, !stockState.inStock && styles.disabledBtn]} onPress={handleBuyNow} activeOpacity={0.9} disabled={!stockState.inStock}>
          <Text style={[styles.buyNowText, { color: t.background }]}>Buy Now</Text>
        </TouchableOpacity>

        {/* Add to Cart */}
        <TouchableOpacity style={[styles.addToCartBtn, { borderColor: t.textPrimary }, !stockState.inStock && styles.disabledBtn]} onPress={handleAddToCart} activeOpacity={0.9} disabled={!stockState.inStock}>
          <Text style={[styles.addToCartText, { color: t.textPrimary }]}>Add to Cart</Text>
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
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: '#242424',
  },
  scroll: {
    paddingTop: 6,
    paddingBottom: 100,
  },
  previewWrap: {
    marginHorizontal: Spacing.lg,
    borderRadius: 18,
    backgroundColor: '#F6F6F6',
    marginBottom: 18,
    position: 'relative',
  },
  previewPlaceholder: {
    width: '100%',
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockWarning: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#B91C1C',
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: Spacing.lg,
  },
  rotateBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 22,
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
    color: '#242424',
    letterSpacing: 0.5,
  },
  sectionSubNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#A5A5A5',
  },
  seeMoreLink: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#0F766E',
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sizeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 5,
  },
  sizeCardActive: {
    borderColor: '#0F766E',
  },
  sizeLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#424242',
  },
  sizeLabelActive: {
    color: '#0F766E',
  },
  sizeSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#A5A5A5',
  },
  baseColorRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  baseColorItem: {
    alignItems: 'center',
    gap: 6,
  },
  baseColorLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B6B6B',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#0F766E',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#242424',
    marginBottom: 12,
    marginTop: 8,
  },
  fontPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  fontPickerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#242424',
  },
  fontDropdown: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  fontOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  fontOptionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#424242',
  },
  fontOptionActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  uploadBox: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
  },
  uploadTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#242424',
    marginTop: 4,
  },
  uploadFormats: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#A5A5A5',
  },
  buyNowBtn: {
    marginHorizontal: Spacing.lg,
    backgroundColor: '#000000',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buyNowText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  addToCartBtn: {
    marginHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: '#242424',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  addToCartText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#242424',
  },
  disabledBtn: {
    opacity: 0.45,
  },
});

