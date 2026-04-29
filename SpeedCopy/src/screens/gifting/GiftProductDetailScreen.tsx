import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Heart,
  Link2,
  Minus,
  Plus,
  Truck,
  RotateCcw,
  Shield,
} from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { CartToast } from '../../components/ui/CartToast';
import { Spacing } from '../../constants/theme';
import { useCartStore } from '../../store/useCartStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { getProductImageUrl, isLikelyMongoId, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { getLiveStockState, LiveStockState } from '../../utils/stock';
import { formatCurrency } from '../../utils/formatCurrency';

type FlowType = 'printing' | 'gifting' | 'shopping';

const FLOW_ACCENT: Record<FlowType, string> = {
  printing: '#4CA1AF',
  gifting: '#0F766E',
  shopping: '#FF6B6B',
};

const FLOW_CUSTOMIZE_ROUTE: Record<FlowType, string> = {
  printing: 'PrintCustomize',
  gifting: 'GiftCustomize',
  shopping: 'PrintCustomize', // shopping flow uses HomeStack's customize too
};

const FLOW_FALLBACK_IMAGE: Record<FlowType, any> = {
  gifting: require('../../../assets/images/gift-prod-mug.png'),
  printing: require('../../../assets/images/print-business-cards.png'),
  shopping: require('../../../assets/images/shop-notebooks.png'),
};

interface ProductData {
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  description: string;
  features: string[];
  imageUri?: string;
  images?: string[];
}

function shadow(e = 3) {
  return Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    android: { elevation: e },
    default: {},
  });
}

export function GiftProductDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    productId,
    image: passedImage,
    flowType = 'gifting',
    name: passedName,
    price: passedPrice,
    originalPrice: passedOriginal,
    discount: passedDiscount,
  } = (route.params ?? {}) as {
    productId: string;
    image?: string;
    flowType?: FlowType;
    name?: string;
    price?: number;
    originalPrice?: number;
    discount?: string;
  };
  const accent = FLOW_ACCENT[flowType];
  const customizeRoute = FLOW_CUSTOMIZE_ROUTE[flowType];
  const { colors: t } = useThemeStore();

  const addItem = useCartStore((s) => s.addItem);
  const { toggleWishlist, isWishlisted } = useOrderStore();

  const fallbackImg = FLOW_FALLBACK_IMAGE[flowType];
  const passedImageUri = toAbsoluteAssetUrl(passedImage);

  const initialProduct: ProductData = {
    name: passedName || 'Product',
    price: passedPrice ?? 0,
    originalPrice: passedOriginal,
    discount: passedDiscount,
    description: '',
    features: [],
    imageUri: passedImageUri || undefined,
  };

  const initialImage: ImageSourcePropType = passedImageUri ? { uri: passedImageUri } : fallbackImg;
  const [product, setProduct] = useState<ProductData>(initialProduct);
  const [productImage, setProductImage] = useState<ImageSourcePropType>(initialImage);
  const [imageUri, setImageUri] = useState<string | undefined>(passedImageUri || undefined);
  const [loading, setLoading] = useState(true);
  const [stockState, setStockState] = useState<LiveStockState>({ inStock: true, availableStock: null, message: '' });
  const [quantity, setQuantity] = useState(1);
  const wishlisted = isWishlisted(productId);

  useEffect(() => {
    let cancelled = false;
    if (!isLikelyMongoId(productId)) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    productsApi.getGiftingProduct(productId)
      .then((p) => {
        if (cancelled) return;
        const thumb = getProductImageUrl(p);
        const { price: apiPrice, originalPrice: apiOriginal, discountLabel } = resolveProductPricing(p);
        setProduct((prev) => ({
          name: p.name || prev.name,
          price: typeof apiPrice === 'number' && apiPrice > 0 ? apiPrice : prev.price,
          originalPrice:
            typeof apiOriginal === 'number' && apiOriginal > (apiPrice ?? 0)
              ? apiOriginal
              : prev.originalPrice,
          discount: discountLabel || prev.discount,
          description: p.description || prev.description,
          features:
            (p as any).highlights?.length
              ? (p as any).highlights
              : (p as any).specs?.features?.length
                ? (p as any).specs.features
                : prev.features,
          imageUri: thumb || prev.imageUri,
          images: p.images,
        }));
        if (thumb) {
          setProductImage({ uri: thumb });
          setImageUri(thumb);
        }
        setStockState(getLiveStockState(p, quantity));
      })
      .catch(() => {
        // keep passed-in card data as the source of truth on API failure
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    if (!isLikelyMongoId(productId)) return;
    productsApi.getGiftingProduct(productId)
      .then((p) => setStockState(getLiveStockState(p, quantity)))
      .catch(() => {});
  }, [productId, quantity]);

  const [selectedThumb, setSelectedThumb] = useState(0);
  const [activeInfoTab, setActiveInfoTab] = useState<'features'>('features');
  const [toastVisible, setToastVisible] = useState(false);
  const galleryImages = useMemo(() => {
    const apiImages = (product.images || [])
      .map((img) => toAbsoluteAssetUrl(img))
      .filter(Boolean);
    return Array.from(new Set([imageUri, product.imageUri, ...apiImages].filter(Boolean))) as string[];
  }, [imageUri, product.imageUri, product.images]);
  const selectedGalleryUri = galleryImages[selectedThumb] || galleryImages[0];

  useEffect(() => {
    if (galleryImages.length > 0 && selectedThumb >= galleryImages.length) {
      setSelectedThumb(0);
    }
  }, [galleryImages.length, selectedThumb]);

  const handleAddToCart = useCallback(() => {
    if (!stockState.inStock) {
      return;
    }
    addItem({
      id: `${flowType}-${productId}-${Date.now()}`,
      backendProductId: productId,
      type: 'product',
      flowType,
      quantity,
      price: product.price,
      name: product.name,
      image: selectedGalleryUri || imageUri || '',
    });
    setToastVisible(true);
  }, [addItem, imageUri, product, productId, quantity, flowType, selectedGalleryUri, stockState.inStock]);

  const navigateToCart = useCallback(() => {
    const parentNav = navigation.getParent();
    if (parentNav) {
      (parentNav as any).navigate('CartTab', { screen: 'Cart' });
      return;
    }
    (navigation as any).navigate('CartTab', { screen: 'Cart' });
  }, [navigation]);

  const handleBuyNow = useCallback(() => {
    handleAddToCart();
    navigateToCart();
  }, [handleAddToCart, navigateToCart]);

  const handleQuantityChange = useCallback((value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      setQuantity(1);
      return;
    }
    setQuantity(Math.max(1, Math.min(999, Number(cleaned))));
  }, []);

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSlot} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Product Details</Text>
        <TouchableOpacity style={styles.headerSlot} onPress={() => toggleWishlist(productId)} hitSlop={12}>
          <Heart
            size={22}
            color={wishlisted ? '#FF4D67' : t.placeholder}
            fill={wishlisted ? '#FF4D67' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <CartToast
        visible={toastVisible}
        productName={product.name}
        onDismiss={() => setToastVisible(false)}
        onViewCart={() => {
          setToastVisible(false);
          navigateToCart();
        }}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Main Image */}
        <View style={[styles.mainImageWrap, { backgroundColor: t.chipBg }]}>
          <Image source={selectedGalleryUri ? { uri: selectedGalleryUri } : productImage} style={styles.mainImage} resizeMode="cover" />
        </View>

        {/* Thumbnails */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {(galleryImages.length ? galleryImages : [undefined, undefined, undefined, undefined]).map((thumbUri, i) => (
            <TouchableOpacity
              key={`${thumbUri || 'fallback'}-${i}`}
              onPress={() => setSelectedThumb(i)}
              style={[
                styles.thumbCard,
                { borderColor: selectedThumb === i ? accent : t.border },
                selectedThumb === i && { borderColor: accent, borderWidth: 2 },
              ]}
            >
              <Image source={thumbUri ? { uri: thumbUri } : productImage} style={styles.thumbImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.productName, { color: t.textPrimary }]}>{product.name}</Text>
            <Link2 size={16} color={t.placeholder} />
          </View>
        <View style={styles.priceRow}>
            <Text style={[styles.price, { color: t.textPrimary }]}>{formatCurrency(product.price)}</Text>
            {product.originalPrice && (
              <Text style={[styles.oldPrice, { color: t.placeholder }]}>{formatCurrency(product.originalPrice)}</Text>
            )}
            {product.discount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discount}</Text>
              </View>
            )}
        </View>
        {!stockState.inStock ? (
          <Text style={styles.stockWarning}>{stockState.message || 'Out of stock'}</Text>
        ) : null}
        <Text style={[styles.taxNote, { color: t.placeholder }]}>Inclusive of all taxes</Text>
        </View>

        {/* Description */}
        <View style={styles.descSection}>
          <Text style={[styles.descTitle, { color: t.textPrimary }]}>Product Description</Text>
          <Text style={[styles.descBody, { color: t.textSecondary }]}>{product.description}</Text>
        </View>

        {/* Quantity & Customize */}
        <View style={styles.qtyRow}>
          <Text style={[styles.qtyLabel, { color: t.textPrimary }]}>Quantity</Text>
          <View style={[styles.qtyControls, { borderColor: t.border }]}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus size={16} color={t.iconDefault} />
            </TouchableOpacity>
            <TextInput
              style={[styles.qtyValue, { color: t.textPrimary, borderColor: t.border }]}
              value={String(quantity)}
              onChangeText={handleQuantityChange}
              keyboardType="number-pad"
              maxLength={3}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Plus size={16} color={t.iconDefault} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.customizeBtn, { borderColor: t.textPrimary }]}
            onPress={() =>
              navigation.navigate(customizeRoute, {
                productId,
                flowType,
                image: selectedGalleryUri || imageUri,
                name: product.name,
              })
            }
          >
            <Text style={[styles.customizeBtnText, { color: t.textPrimary }]}>Customize</Text>
          </TouchableOpacity>
        </View>

        {/* Buy Now */}
        <TouchableOpacity style={[styles.buyNowBtn, { backgroundColor: t.textPrimary }, !stockState.inStock && styles.disabledBtn]} onPress={handleBuyNow} activeOpacity={0.9} disabled={!stockState.inStock}>
          <Text style={[styles.buyNowText, { color: t.background }]}>Buy Now</Text>
        </TouchableOpacity>

        {/* Add to Cart */}
        <TouchableOpacity style={[styles.addToCartBtn, { borderColor: t.textPrimary }, !stockState.inStock && styles.disabledBtn]} onPress={handleAddToCart} activeOpacity={0.9} disabled={!stockState.inStock}>
          <Text style={[styles.addToCartText, { color: t.textPrimary }]}>Add to Cart</Text>
        </TouchableOpacity>

        {/* Trust Badges */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Truck size={20} color={t.iconDefault} />
            <Text style={[styles.trustLabel, { color: t.textMuted }]}>Free Delivery</Text>
          </View>
          <View style={styles.trustItem}>
            <RotateCcw size={20} color={t.iconDefault} />
            <Text style={[styles.trustLabel, { color: t.textMuted }]}>7 Day Return</Text>
          </View>
          <View style={styles.trustItem}>
            <Shield size={20} color={t.iconDefault} />
            <Text style={[styles.trustLabel, { color: t.textMuted }]}>Secure Payment</Text>
          </View>
        </View>

        {/* Select Quick Design */}
        <Text style={[styles.quickDesignTitle, { color: t.textPrimary }]}>Select Quick Design</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickDesignRow}>
          {[1, 2, 3, 4].map((d) => (
            <TouchableOpacity key={d} style={[styles.quickDesignCard, shadow(), { backgroundColor: t.card }]}>
              <Image source={selectedGalleryUri ? { uri: selectedGalleryUri } : productImage} style={styles.quickDesignImg} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Features Tab */}
        <View style={styles.infoTabs}>
          <TouchableOpacity
            style={[
              styles.infoTab,
              { backgroundColor: accent },
            ]}
            onPress={() => setActiveInfoTab('features')}
          >
            <Text style={[
              styles.infoTabText,
              { color: '#FFFFFF' },
            ]}>
              Features
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresBlock}>
          <Text style={[styles.featuresTitle, { color: t.textPrimary }]}>Product Features</Text>
          {product.features.length > 0 ? (
            product.features.map((f, i) => (
              <View key={i} style={styles.featureItem}>
                <Text style={[styles.featureBullet, { color: t.textMuted }]}>{'\u2022'}</Text>
                <Text style={[styles.featureText, { color: t.textMuted }]}>{f}</Text>
              </View>
            ))
          ) : (
            <View style={styles.featureItem}>
              <Text style={[styles.featureText, { color: t.textMuted }]}>No additional product details available.</Text>
            </View>
          )}
        </View>
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
    lineHeight: 24,
    color: '#242424',
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    paddingTop: 6,
    paddingBottom: 100,
  },
  mainImageWrap: {
    marginHorizontal: Spacing.lg,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F6F6F6',
    marginBottom: 14,
  },
  mainImage: {
    width: '100%',
    height: 280,
    borderRadius: 16,
  },
  thumbRow: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: 18,
    paddingRight: Spacing.xl,
  },
  thumbCard: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  thumbCardActive: {
    borderColor: '#0F766E',
    borderWidth: 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  infoSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 26,
    color: '#242424',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  price: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#000',
  },
  oldPrice: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#A5A5A5',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#00A63E',
  },
  taxNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#A5A5A5',
    marginTop: 2,
  },
  stockWarning: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 6,
  },
  descSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: 14,
    marginBottom: 18,
  },
  descTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#242424',
    marginBottom: 6,
  },
  descBody: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: '#6B6B6B',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    marginBottom: 18,
    gap: 12,
  },
  qtyLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#242424',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#242424',
    width: 38,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E0E0E0',
    height: 38,
    paddingVertical: 0,
  },
  customizeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#242424',
    borderRadius: 12,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizeBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#242424',
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
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    marginBottom: 22,
    gap: 12,
  },
  trustItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  trustLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#424242',
  },
  quickDesignTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#242424',
    paddingHorizontal: Spacing.lg,
    marginBottom: 10,
  },
  quickDesignRow: {
    paddingHorizontal: Spacing.lg,
    gap: 12,
    marginBottom: 22,
  },
  quickDesignCard: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  quickDesignImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  infoTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: 14,
  },
  infoTab: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F6F6F6',
  },
  infoTabActive: {
    backgroundColor: '#0F766E',
  },
  infoTabText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#6B6B6B',
  },
  infoTabTextActive: {
    color: '#FFFFFF',
  },
  featuresBlock: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 20,
  },
  featuresTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#242424',
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  featureBullet: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#424242',
    marginTop: 1,
  },
  featureText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: '#424242',
    flex: 1,
  },
});

