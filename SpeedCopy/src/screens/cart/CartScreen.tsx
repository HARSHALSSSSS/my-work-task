import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, ChevronRight, ChevronUp, Lock, ShoppingBag, Pencil, FileText } from 'lucide-react-native';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';

const emptyCartImg = require('../../../assets/empty-cart.png');
import { AppTabParamList, CartStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/useCartStore';
import { useThemeStore } from '../../store/useThemeStore';
import { CartItem } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { resolveProductPricing } from '../../utils/pricing';
import { dedupeProducts, inferFlowTypeFromItemId, resolveProductImageSource, sortProducts, toAbsoluteAssetUrl } from '../../utils/product';
import { fetchCartStockMap, LiveStockState } from '../../utils/stock';
import * as cartApi from '../../api/cart';
import * as productsApi from '../../api/products';

type CartNav = CompositeNavigationProp<
  NativeStackNavigationProp<CartStackParamList, 'Cart'>,
  BottomTabNavigationProp<AppTabParamList>
>;

const TEAL_PRIMARY = '#0F766E';
const TAG_GREEN_BG = '#E8F8EE';
const TAG_GREEN_TEXT = '#00A63E';
const TAG_GRAY_BG = '#ECECEC';
const TAG_GRAY_TEXT = '#6B6B6B';

type SuggestionFlow = 'printing' | 'gifting' | 'shopping';

type SuggestedProduct = {
  id: string;
  name: string;
  flowType: SuggestionFlow;
  price: number;
  originalPrice?: number;
  discountLabel?: string;
  image?: string;
  imageCandidates?: string[];
  imageKey?: string;
};

type AppliedCoupon = {
  code: string;
  discount: number;
  finalTotal: number;
  subtotal: number;
  flowType?: SuggestionFlow;
};

const SUGGESTION_LIMIT = 8;

function getItemSubtitle(item: CartItem): string {
  if (item.type === 'printing' && item.printConfig) {
    const side = item.printConfig.printSide === 'two-sided' ? 'Two Sided' : 'One Sided';
    const bind = item.printConfig.printType === 'stapled' ? 'Staple' : 'Loose';
    return `${side} | ${bind}`;
  }
  return 'One Sided | Staple';
}

function isImageLikeFile(file?: string): boolean {
  const raw = String(file || '').toLowerCase();
  if (!raw) return false;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/uploads/')) return true;
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => raw.includes(ext));
}

function cartCardShadow() {
  return Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  });
}

function getCartFlowType(item: CartItem): SuggestionFlow {
  return (
    item.flowType ||
    (item.type === 'printing'
      ? 'printing'
      : item.type === 'gifting'
        ? 'gifting'
        : inferFlowTypeFromItemId(item.id))
  );
}

function extractProductList(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.products)) return res.products;
  if (Array.isArray(res.data?.products)) return res.data.products;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

function resolveSuggestionPrice(product: any): { price: number; originalPrice?: number; discountLabel?: string } {
  return resolveProductPricing(product);
}

function normalizeCouponResult(
  response: any,
  fallbackCode: string,
  subtotal: number,
  flowType?: SuggestionFlow,
): AppliedCoupon {
  const discount = Math.max(0, Number(response?.discount ?? 0) || 0);
  const finalTotalRaw = Number(response?.finalTotal);
  const finalTotal = Number.isFinite(finalTotalRaw)
    ? Math.max(0, finalTotalRaw)
    : Math.max(0, subtotal - discount);

  return {
    code: String(response?.couponCode || fallbackCode).trim() || fallbackCode,
    discount,
    finalTotal,
    subtotal,
    flowType,
  };
}

function mapProductToSuggestion(product: any, fallbackFlow: SuggestionFlow): SuggestedProduct | null {
  const id = String(product?._id || product?.id || '').trim();
  if (!id) return null;
  const name = String(product?.name || 'Product').trim();
  const incomingFlow = String(product?.flowType || '').toLowerCase();
  const flowType: SuggestionFlow =
    incomingFlow === 'printing' || incomingFlow === 'gifting' || incomingFlow === 'shopping'
      ? incomingFlow
      : fallbackFlow;
  const { price, originalPrice, discountLabel } = resolveSuggestionPrice(product);
  const { imageUri, imageCandidates, imageKey } = resolveProductImageSource(product);

  return {
    id,
    name,
    flowType,
    price,
    originalPrice,
    discountLabel,
    image: imageUri || undefined,
    imageCandidates,
    imageKey,
  };
}

function mapSuggestionFromSources(
  primaryProduct: any,
  fallbackFlow: SuggestionFlow,
  ...extraSources: any[]
): SuggestedProduct | null {
  const suggestion = mapProductToSuggestion(primaryProduct, fallbackFlow);
  if (!suggestion) return null;

  const { imageUri, imageCandidates, imageKey } = resolveProductImageSource(primaryProduct, ...extraSources);
  return {
    ...suggestion,
    imageCandidates,
    image: imageUri || suggestion.image,
    imageKey,
  };
}

async function enrichSuggestionProduct(product: any, fallbackFlow: SuggestionFlow): Promise<SuggestedProduct | null> {
  const initial = mapSuggestionFromSources(product, fallbackFlow);
  if (!initial?.id) return null;
  if ((initial.imageCandidates?.length || 0) > 1) return initial;

  try {
    let detailProduct: any = null;
    if (initial.flowType === 'shopping') {
      detailProduct = await productsApi.getShoppingProduct(initial.id).catch(() => null);
    } else if (initial.flowType === 'gifting') {
      detailProduct = await productsApi.getGiftingProduct(initial.id).catch(() => null);
    } else {
      detailProduct = await productsApi.getBusinessPrintProduct(initial.id).catch(() => null);
    }
    return mapSuggestionFromSources(detailProduct || product, initial.flowType, product);
  } catch {
    return initial;
  }
}

function SuggestionImage({
  product,
  backgroundColor,
  iconColor,
}: {
  product: SuggestedProduct;
  backgroundColor: string;
  iconColor: string;
}) {
  const fallbackResolved = React.useMemo(
    () => resolveProductImageSource({ image: product.image }),
    [product.image],
  );
  const candidates = React.useMemo(
    () => (product.imageCandidates?.length ? product.imageCandidates : fallbackResolved.imageCandidates),
    [fallbackResolved.imageCandidates, product.imageCandidates],
  );
  const candidateKey = product.imageKey || candidates.join('|');
  const [imageIndex, setImageIndex] = React.useState(0);

  React.useEffect(() => {
    setImageIndex(0);
  }, [product.id, candidateKey]);

  const activeImage = candidates[imageIndex];

  return (
    <View style={[styles.suggestionImageWrap, { backgroundColor }]}>
      {activeImage ? (
        <Image
          source={{ uri: activeImage }}
          style={styles.suggestionImage}
          resizeMode="cover"
          onError={() => setImageIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : candidates.length))}
        />
      ) : (
        <ShoppingBag size={24} color={iconColor} />
      )}
    </View>
  );
}

export function CartScreen() {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation<CartNav>();
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getTotal = useCartStore((s) => s.getTotal);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const syncing = useCartStore((s) => s.syncing);
  const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, LiveStockState>>({});
  const [showExploreMore, setShowExploreMore] = useState(false);

  const [loadedOnce, setLoadedOnce] = useState(false);
  useEffect(() => {
    fetchCart().finally(() => setLoadedOnce(true));
  }, [fetchCart]);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const subtotal = useMemo(() => getTotal(), [getTotal, items]);
  const dominantCartFlow = useMemo<SuggestionFlow>(() => {
    const counts: Record<SuggestionFlow, number> = {
      printing: 0,
      gifting: 0,
      shopping: 0,
    };
    for (const item of items) {
      counts[getCartFlowType(item)] += 1;
    }
    if (counts.printing >= counts.gifting && counts.printing >= counts.shopping) return 'printing';
    if (counts.gifting >= counts.shopping) return 'gifting';
    return 'shopping';
  }, [items]);
  const cartProductIds = useMemo(
    () =>
      new Set(
        items
          .map((item) => String(item.backendProductId || '').trim())
          .filter(Boolean),
      ),
    [items],
  );
  const cartProductSignature = useMemo(
    () => Array.from(cartProductIds).sort().join('|'),
    [cartProductIds],
  );
  const couponFlowType = useMemo<SuggestionFlow | undefined>(() => {
    const unique = Array.from(new Set(items.map((item) => getCartFlowType(item))));
    return unique.length === 1 ? unique[0] : undefined;
  }, [items]);

  const discountAmount = appliedCoupon?.discount ?? 0;
  const taxGst = 0;
  const totalPayable = Math.max(0, subtotal - discountAmount + taxGst);
  const unavailableItems = useMemo(
    () => items.filter((item) => stockMap[item.id] && !stockMap[item.id].inStock),
    [items, stockMap],
  );
  const hasUnavailableItems = unavailableItems.length > 0;

  const applyCoupon = useCallback(async () => {
    const code = couponCode.trim();
    if (!code || applyingCoupon) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await cartApi.applyCoupon(code, subtotal, couponFlowType);
      setAppliedCoupon(normalizeCouponResult(res, code, subtotal, couponFlowType));
    } catch (e: any) {
      const msg = e?.serverMessage || e?.response?.data?.message || e?.message || 'Could not apply coupon.';
      setCouponError(msg);
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  }, [applyingCoupon, couponCode, couponFlowType, subtotal]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  }, []);

  useEffect(() => {
    if (!appliedCoupon?.code) return;
    if (items.length === 0) {
      setAppliedCoupon(null);
      return;
    }
    if (appliedCoupon.subtotal === subtotal && appliedCoupon.flowType === couponFlowType) return;

    let active = true;
    setCouponError(null);

    cartApi.applyCoupon(appliedCoupon.code, subtotal, couponFlowType)
      .then((res) => {
        if (!active) return;
        setAppliedCoupon(normalizeCouponResult(res, appliedCoupon.code, subtotal, couponFlowType));
      })
      .catch((e: any) => {
        if (!active) return;
        const msg = e?.serverMessage || e?.response?.data?.message || e?.message || 'Coupon is no longer valid for this cart.';
        setAppliedCoupon(null);
        setCouponError(msg);
      });

    return () => {
      active = false;
    };
  }, [appliedCoupon?.code, appliedCoupon?.flowType, appliedCoupon?.subtotal, couponFlowType, items.length, subtotal]);

  useEffect(() => {
    let active = true;
    fetchCartStockMap(items)
      .then((next) => {
        if (active) setStockMap(next);
      })
      .catch(() => {
        if (active) setStockMap({});
      });
    return () => {
      active = false;
    };
  }, [items]);

  useEffect(() => {
    let active = true;

    async function loadSuggestions() {
      if (items.length === 0) {
        if (active) setSuggestedProducts([]);
        return;
      }

      setLoadingSuggestions(true);
      try {
        let rawProducts: any[] = [];
        if (dominantCartFlow === 'shopping') {
          const shoppingRes = await productsApi.getShoppingProducts({ limit: 30 });
          rawProducts = extractProductList(shoppingRes);
        } else if (dominantCartFlow === 'gifting') {
          const giftingRes = await productsApi.getGiftingProducts({ limit: 30 });
          rawProducts = extractProductList(giftingRes);
        } else {
          const [businessRes, genericRes] = await Promise.all([
            productsApi.getBusinessPrintProducts({ limit: 30 }).catch(() => null),
            productsApi.getProducts({ flowType: 'printing', limit: 30 }).catch(() => null),
          ]);
          rawProducts = [...extractProductList(businessRes), ...extractProductList(genericRes)];
        }

        const uniqueRaw = sortProducts(dedupeProducts(rawProducts));
        const enriched = await Promise.all(uniqueRaw.map((p) => enrichSuggestionProduct(p, dominantCartFlow)));
        const mapped = enriched
          .filter((p): p is SuggestedProduct => Boolean(p))
          .filter((p) => !cartProductIds.has(p.id))
          .slice(0, SUGGESTION_LIMIT);

        if (active) setSuggestedProducts(mapped);
      } catch {
        if (active) setSuggestedProducts([]);
      } finally {
        if (active) setLoadingSuggestions(false);
      }
    }

    loadSuggestions();
    return () => {
      active = false;
    };
  }, [dominantCartFlow, items.length, cartProductSignature, cartProductIds]);


  const onSuggestionPress = useCallback(
    (product: SuggestedProduct) => {
      if (product.flowType === 'gifting') {
        navigation.navigate('GiftTab', {
          screen: 'GiftProductDetail',
          params: {
            productId: product.id,
            flowType: 'gifting',
            name: product.name,
            image: product.image,
            price: product.price,
            originalPrice: product.originalPrice,
            discount: product.discountLabel,
          },
        });
        return;
      }
      if (product.flowType === 'printing') {
        navigation.navigate('HomeTab', {
          screen: 'BusinessProductDetail',
          params: {
            productId: product.id,
            flowType: 'printing',
            name: product.name,
            image: product.image,
            price: product.price,
            originalPrice: product.originalPrice,
            discount: product.discountLabel,
          },
        });
        return;
      }
      navigation.navigate('HomeTab', {
        screen: 'StationeryDetail',
        params: {
          productId: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          originalPrice: product.originalPrice,
          discount: product.discountLabel,
        },
      });
    },
    [navigation],
  );

  const onAddSuggestion = useCallback(
    (product: SuggestedProduct) => {
      const existing = items.find((item) => (
        String(item.backendProductId || '').trim() === product.id
        && getCartFlowType(item) === product.flowType
      ));
      if (existing) {
        updateQuantity(existing.id, existing.quantity + 1);
        return;
      }
      addItem({
        id: `${product.flowType}-${product.id}-${Date.now()}`,
        backendProductId: product.id,
        type: product.flowType === 'printing' ? 'printing' : 'product',
        flowType: product.flowType,
        quantity: 1,
        price: product.price,
        name: product.name,
        image: product.image,
      });
    },
    [addItem, items, updateQuantity],
  );

  const goCheckout = useCallback(() => {
    if (!agreedToTerms) return;
    if (hasUnavailableItems) {
      Alert.alert('Out of stock', 'One or more cart items are out of stock. Please remove them before checkout.');
      return;
    }
    navigation.navigate('Address', {
      couponCode: appliedCoupon?.code,
      couponDiscount: discountAmount,
    });
  }, [agreedToTerms, appliedCoupon?.code, discountAmount, hasUnavailableItems, navigation]);

  const onEditItem = useCallback(
    (item: CartItem) => {
      const flowType =
        item.flowType ||
        (item.type === 'printing'
          ? 'printing'
          : item.type === 'gifting'
            ? 'gifting'
            : inferFlowTypeFromItemId(item.id));
      const fromCustomize = Boolean(item.designId);
      const backendProductId = String(item.backendProductId || '').trim();

      if (fromCustomize) {
        if (!backendProductId) {
          Alert.alert('Unable to edit', 'Product details are unavailable for this customized item.');
          return;
        }
        if (flowType === 'gifting') {
          navigation.navigate('GiftTab', {
            screen: 'GiftCustomize',
            params: {
              productId: backendProductId,
              image: item.image,
              name: item.name,
              designId: item.designId,
            },
          });
          return;
        }
        navigation.navigate('HomeTab', {
          screen: 'PrintCustomize',
          params: {
            productId: backendProductId,
            flowType,
            image: item.image,
            name: item.name,
            designId: item.designId,
            businessConfigDraft: item.businessConfigDraft,
          },
        });
        return;
      }

      if (flowType === 'printing') {
        if (item.type === 'printing') {
          navigation.navigate('HomeTab', {
            screen: 'StandardPrinting',
            params: {
              subService: item.printConfig?.serviceType || 'standard',
              deliveryMode: item.printConfig?.deliveryMethod,
              locationId: item.printConfig?.shopId,
              servicePackage: item.printConfig?.servicePackage,
              customColorDescription: item.printConfig?.customColorDescription,
              initialFileName: item.printConfig?.fileName,
              initialFileUri: item.printConfig?.fileUri,
              initialFileMime: item.printConfig?.fileMime,
              initialUploadedFile: item.printConfig?.uploadedFile,
              initialColorMode: item.printConfig?.colorMode,
              initialPageSize: item.printConfig?.pageSize,
              initialPrintSide: item.printConfig?.printSide,
              initialPrintType: item.printConfig?.printType,
              initialCopies: item.printConfig?.copies,
              initialLinearGraph: item.printConfig?.addons?.linearGraph,
              initialSemiLogGraph: item.printConfig?.addons?.semiLogGraph,
              initialInstructions: item.printConfig?.specialInstructions,
              initialCoverPage: item.printConfig?.coverPage,
              initialBindingCover: item.printConfig?.bindingCover,
              initialCdOption: item.printConfig?.cdOption,
              initialThesisSpineText: item.printConfig?.thesisSpineText,
            },
          });
          return;
        }
        if (backendProductId) {
          navigation.navigate('HomeTab', {
            screen: 'BusinessProductDetail',
            params: {
              productId: backendProductId,
              flowType: 'printing',
              name: item.name,
              image: item.image,
              price: item.price,
            },
          });
          return;
        }
        Alert.alert('Unable to edit', 'Product details are unavailable for this item.');
        return;
      }
      if (flowType === 'gifting') {
        if (backendProductId) {
          navigation.navigate('GiftTab', {
            screen: 'GiftProductDetail',
            params: {
              productId: backendProductId,
              flowType: 'gifting',
              name: item.name,
              image: item.image,
              price: item.price,
            },
          });
          return;
        }
        navigation.navigate('GiftTab', { screen: 'GiftStore' });
        return;
      }
      if (backendProductId) {
        navigation.navigate('HomeTab', {
          screen: 'StationeryDetail',
          params: {
            productId: backendProductId,
            name: item.name,
            image: item.image,
            price: item.price,
          },
        });
        return;
      }
      navigation.navigate('HomeTab', { screen: 'ShopByCategory' });
    },
    [navigation],
  );

  const header = (
    <View style={styles.headerRow}>
      <View style={styles.headerSlot} />
      <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Cart</Text>
      <View style={styles.headerTags}>
        <View style={[styles.tag, styles.tagGreen]}>
          <Text style={styles.tagGreenText}>Discount</Text>
        </View>
        <View style={[styles.tag, styles.tagGray, { backgroundColor: t.chipBg }]}>
          <Text style={[styles.tagGrayText, { color: t.textSecondary }]}>T&C</Text>
        </View>
      </View>
    </View>
  );

  if (syncing && !loadedOnce) {
    return (
      <SafeScreen>
        {header}
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={t.textPrimary} />
          <Text style={[styles.emptyText, { color: t.textSecondary, fontSize: 14, marginTop: 8 }]}>Loading your cart...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (items.length === 0) {
    return (
      <SafeScreen>
        {header}
        <View style={styles.emptyWrap}>
          <Image source={emptyCartImg} style={styles.emptyImg} resizeMode="contain" />
          <Text style={[styles.emptyText, { color: t.textPrimary }]}>Your Cart is empty</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      {header}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {hasUnavailableItems ? (
          <View style={styles.stockAlert}>
            <Text style={styles.stockAlertTitle}>Some items are out of stock</Text>
            <Text style={styles.stockAlertText}>
              Remove unavailable items before proceeding to checkout.
            </Text>
          </View>
        ) : null}

        {items.map((item) => (
          <View key={item.id} style={[styles.itemCard, cartCardShadow(), { backgroundColor: t.card }]}>
            {/* Top row: Remove & Edit */}
            <View style={styles.topLinkRow}>
              <TouchableOpacity
                onPress={() => removeItem(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.linkRemove, { color: t.textMuted }]}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onEditItem(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.editLink}
              >
                <Pencil size={12} color={Colors.blueAccent} />
                <Text style={styles.linkEdit}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.itemRow}>
              <View style={styles.thumbWrap}>
                {item.image && (getCartFlowType(item) !== 'printing' || isImageLikeFile(item.image) || isImageLikeFile(item.printConfig?.fileName)) ? (
                  <Image source={{ uri: toAbsoluteAssetUrl(item.image) }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumbPlaceholder, { backgroundColor: t.chipBg }]}>
                    {String(item.printConfig?.fileName || item.image || '').toLowerCase().includes('.pdf') ? (
                      <FileText size={28} color={t.iconDefault} />
                    ) : (
                      <ShoppingBag size={28} color={t.iconDefault} />
                    )}
                  </View>
                )}
              </View>

              <View style={styles.itemBody}>
                <Text style={[styles.productTitle, { color: t.textPrimary }]} numberOfLines={2}>
                  {item.name || 'A4 Print'}
                </Text>
                <Text style={[styles.productDesc, { color: t.textSecondary }]} numberOfLines={2}>
                  {getItemSubtitle(item)}
                </Text>
                <Text style={[styles.qtyLine, { color: t.textMuted }]}>
                  Quantity: {String(item.quantity).padStart(2, '0')} Copies
                </Text>
                {stockMap[item.id] && !stockMap[item.id].inStock ? (
                  <Text style={styles.itemStockWarning}>
                    {stockMap[item.id].message || 'Out of stock'}
                  </Text>
                ) : null}
              </View>

            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.exploreToggle, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={() => setShowExploreMore((prev) => !prev)}
          activeOpacity={0.85}
        >
          <View style={styles.exploreToggleTextWrap}>
            <Text style={[styles.exploreToggleTitle, { color: t.textPrimary }]}>Explore more options</Text>
            <Text style={[styles.exploreToggleSub, { color: t.textSecondary }]}>Suggested products based on your cart</Text>
          </View>
          {showExploreMore ? <ChevronUp size={18} color={t.textSecondary} /> : <ChevronDown size={18} color={t.textSecondary} />}
        </TouchableOpacity>

        {showExploreMore ? (
          <>
            <View style={styles.suggestionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: t.textPrimary }]}>Suggested for you</Text>
              <Text style={[styles.suggestionHint, { color: t.textSecondary }]}>Based on your cart</Text>
            </View>
            {loadingSuggestions ? (
              <View style={styles.suggestionLoadingWrap}>
                <ActivityIndicator size="small" color={t.textPrimary} />
              </View>
            ) : suggestedProducts.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionRow}
              >
                {suggestedProducts.map((product) => (
                  <View
                    key={product.id}
                    style={[styles.suggestionCard, cartCardShadow(), { backgroundColor: t.card, borderColor: t.divider }]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => onSuggestionPress(product)}
                      style={styles.suggestionTapArea}
                    >
                      <SuggestionImage
                        product={product}
                        backgroundColor={t.chipBg}
                        iconColor={t.iconDefault}
                      />
                      <View style={styles.suggestionBody}>
                        <Text style={[styles.suggestionName, { color: t.textPrimary }]} numberOfLines={2}>
                          {product.name}
                        </Text>
                        <View style={styles.suggestionPriceRow}>
                          <Text style={[styles.suggestionPrice, { color: t.textPrimary }]}>{formatCurrency(product.price)}</Text>
                          {product.originalPrice ? (
                            <Text style={[styles.suggestionOldPrice, { color: t.placeholder }]}>
                              {formatCurrency(product.originalPrice)}
                            </Text>
                          ) : null}
                        </View>
                        {product.discountLabel ? (
                          <View style={styles.suggestionBadge}>
                            <Text style={styles.suggestionBadgeText} numberOfLines={1}>
                              {product.discountLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onAddSuggestion(product)}
                      style={[styles.suggestionAddBtn, { backgroundColor: t.textPrimary }]}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.suggestionAddText, { color: t.background }]}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.suggestionEmpty, { color: t.textSecondary }]}>
                We will show relevant products here as your cart grows.
              </Text>
            )}
          </>
        ) : null}

        <Text style={[styles.genuineNote, { color: t.textSecondary }]}>100% Secure Payment</Text>

        {/* Coupon */}
        <View style={[styles.couponBlock, { backgroundColor: t.card, borderColor: t.border }]}>
          {appliedCoupon ? (
            <View style={styles.couponAppliedRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.couponAppliedCode, { color: TEAL_PRIMARY }]}>
                  {appliedCoupon.code} applied
                </Text>
                <Text style={[styles.couponAppliedSub, { color: t.textSecondary }]}>
                  You saved {formatCurrency(appliedCoupon.discount)}
                </Text>
              </View>
              <TouchableOpacity onPress={removeCoupon}>
                <Text style={[styles.couponRemove, { color: '#EB5757' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[styles.couponInputRow, { borderColor: t.border }]}>
                <TextInput
                  style={[styles.couponInput, { color: t.textPrimary }]}
                  placeholder="Enter coupon code"
                  placeholderTextColor={t.placeholder}
                  value={couponCode}
                  onChangeText={(v) => { setCouponCode(v.toUpperCase()); setCouponError(null); }}
                  autoCapitalize="characters"
                  editable={!applyingCoupon}
                />
                <TouchableOpacity
                  onPress={applyCoupon}
                  disabled={!couponCode.trim() || applyingCoupon}
                  style={[styles.couponApplyBtn, (!couponCode.trim() || applyingCoupon) && { opacity: 0.5 }]}
                >
                  {applyingCoupon ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.couponApplyText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
              {couponError && <Text style={[styles.couponErrorText, { color: '#EB5757' }]}>{couponError}</Text>}
            </>
          )}
        </View>

        <View style={[styles.priceBlock, { backgroundColor: t.card }]}>
          <Text style={[styles.priceHeading, { color: t.textPrimary }]}>Price Details</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: t.textSecondary }]}>Base Price</Text>
            <Text style={[styles.priceValue, { color: t.textPrimary }]}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: t.textSecondary }]}>Discount{appliedCoupon ? ` (${appliedCoupon.code})` : ''}</Text>
            <Text style={[styles.priceValue, styles.discountValue]}>
              {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : formatCurrency(0)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: t.textSecondary }]}>Delivery charges</Text>
            <Text style={[styles.priceValue, styles.discountValue]}>Free</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow, { borderTopColor: t.divider }]}>
            <Text style={[styles.totalLabel, { color: t.textPrimary }]}>Total payable</Text>
            <Text style={[styles.totalValue, { color: t.textPrimary }]}>{formatCurrency(totalPayable)}</Text>
          </View>
        </View>

        <Pressable
          style={styles.agreementRow}
          onPress={() => setAgreedToTerms((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreedToTerms }}
        >
          <View
            style={[
              styles.checkboxOuter,
              { borderColor: t.border },
              agreedToTerms && styles.checkboxOuterOn,
            ]}
          >
            {agreedToTerms ? <Text style={styles.checkboxTick}>{'\u2713'}</Text> : null}
          </View>
          <Text style={[styles.agreementText, { color: t.textMuted }]}>
            SpeedCopy Service Agreement - I agree to the terms for printing and delivery.
          </Text>
        </Pressable>

        <TouchableOpacity
          style={[styles.btnTeal, (!agreedToTerms || hasUnavailableItems) && styles.btnDisabled]}
          onPress={goCheckout}
          disabled={!agreedToTerms || hasUnavailableItems}
          activeOpacity={0.9}
        >
          <Lock size={17} color={t.background} />
          <Text style={[styles.btnTealText, { color: t.background }]}>Proceed to checkout</Text>
          <ChevronRight size={18} color={t.background} />
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
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
    width: 40,
    minHeight: 40,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textDark,
    flex: 1,
    textAlign: 'center',
  },
  headerTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 40,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.chip,
  },
  tagGreen: {
    backgroundColor: TAG_GREEN_BG,
  },
  tagGreenText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: TAG_GREEN_TEXT,
  },
  tagGray: {
    backgroundColor: TAG_GRAY_BG,
  },
  tagGrayText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: TAG_GRAY_TEXT,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.sm,
  },
  stockAlert: {
    backgroundColor: '#FEF2F2',
    borderRadius: Radii.section,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  stockAlertTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#B91C1C',
  },
  stockAlertText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#991B1B',
    marginTop: 4,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.section,
    padding: Spacing.md,
  },
  topLinkRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expressBadge: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 6,
  },
  expressTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#242424',
  },
  expressSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  thumbWrap: {
    width: 70,
    height: 70,
    borderRadius: Radii.small,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  productTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
  },
  productDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  qtyLine: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemStockWarning: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    lineHeight: 18,
    color: '#B91C1C',
    marginTop: 4,
  },
  linkRemove: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#424242',
  },
  linkEdit: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: Colors.blueAccent,
  },
  sectionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textDark,
  },
  exploreToggle: {
    borderWidth: 1,
    borderRadius: Radii.section,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  exploreToggleTextWrap: {
    flex: 1,
    gap: 1,
  },
  exploreToggleTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  exploreToggleSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  addOnRow: {
    gap: Spacing.md,
    paddingVertical: 4,
  },
  addOnCard: {
    width: 92,
    backgroundColor: Colors.surface,
    borderRadius: Radii.section,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addOnThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radii.small,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOnLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  suggestionHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
  },
  suggestionLoadingWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  suggestionRow: {
    gap: Spacing.sm,
    paddingVertical: 4,
    paddingRight: 2,
  },
  suggestionCard: {
    width: 156,
    borderRadius: Radii.section,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionTapArea: {
    flex: 1,
  },
  suggestionImageWrap: {
    width: '100%',
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  suggestionImage: {
    width: '100%',
    height: '100%',
  },
  suggestionBody: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: 4,
  },
  suggestionName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  suggestionPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
  },
  suggestionOldPrice: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  suggestionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F8EE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  suggestionBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#00A63E',
    fontSize: 10,
  },
  suggestionAddBtn: {
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radii.button,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionAddText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  suggestionEmpty: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  bloomBanner: {
    borderRadius: Radii.section,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  bloomTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  bloomSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  designCardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  designCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.surface,
    borderRadius: Radii.section,
    overflow: 'hidden',
  },
  designImgPlaceholder: {
    width: '100%',
    height: 116,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  designBtnExplore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  designBtnStart: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  designBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  genuineNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  priceBlock: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.section,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  priceHeading: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  priceValue: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
  },
  discountValue: {
    color: Colors.green,
  },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderGray,
  },
  totalLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textDark,
  },
  totalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.borderGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOuterOn: {
    borderColor: TEAL_PRIMARY,
    backgroundColor: TEAL_PRIMARY,
  },
  checkboxTick: {
    color: Colors.surface,
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
  },
  agreementText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  btnTeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: TEAL_PRIMARY,
    borderRadius: Radii.button,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    minHeight: 44,
  },
  btnTealText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyImg: {
    width: 220,
    height: 220,
  },
  emptyText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#000000',
    marginTop: 16,
  },
  couponBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.section,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  couponInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  couponApplyBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: TEAL_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  couponApplyText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  couponErrorText: {
    marginTop: 8,
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  couponAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  couponAppliedCode: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  couponAppliedSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  couponRemove: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
});

