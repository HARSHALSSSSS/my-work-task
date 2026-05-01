import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ShoppingBag } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Product } from '../../types';
import * as productsApi from '../../api/products';
import { inferFlowTypeFromItemId, resolveProductImageSource } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { isCatalogProductInStock } from '../../utils/stock';

type WishlistFlow = 'printing' | 'gifting' | 'shopping';

type WishlistItem = Product & {
  flowType: WishlistFlow;
  imageCandidates: string[];
  imageKey: string;
};

const FLOW_FALLBACK_IMAGE_URI: Record<WishlistFlow, string> = {
  gifting: Image.resolveAssetSource(require('../../../assets/images/gift-prod-mug.png'))?.uri || '',
  printing: Image.resolveAssetSource(require('../../../assets/images/print-business-cards.png'))?.uri || '',
  shopping: Image.resolveAssetSource(require('../../../assets/images/shop-notebooks.png'))?.uri || '',
};

function cardShadow() {
  return Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    android: { elevation: 2 },
    default: {},
  });
}

function pickString(...values: any[]): string {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function normalizeFlow(value: any): WishlistFlow | '' {
  const raw = String(value || '').toLowerCase();
  if (raw === 'printing' || raw === 'business_printing' || raw === 'business-printing') return 'printing';
  if (raw === 'gifting' || raw === 'gift') return 'gifting';
  if (raw === 'shopping' || raw === 'shop' || raw === 'stationery') return 'shopping';
  return '';
}

function resolveWishlistFlow(id: string, payloads: Array<{ flowHint: WishlistFlow; payload: any }>): WishlistFlow {
  for (const { payload } of payloads) {
    const resolved = normalizeFlow(
      payload?.flowType
      || payload?.flow_type
      || payload?.category?.flowType
      || payload?.category?.flow_type
      || payload?.product?.flowType
      || payload?.product?.flow_type
      || payload?.type,
    );
    if (resolved) return resolved;
  }

  const hinted = payloads.find(({ payload }) => payload && typeof payload === 'object');
  if (hinted) return hinted.flowHint;

  return inferFlowTypeFromItemId(id);
}

function WishlistThumbnail({
  item,
  iconColor,
}: {
  item: WishlistItem;
  iconColor: string;
}) {
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [item.id, item.imageKey]);

  const activeUri = item.imageCandidates[imageIndex] || '';

  if (activeUri) {
    return (
      <Image
        source={{ uri: activeUri }}
        style={styles.thumbImage}
        resizeMode="cover"
        onError={() => setImageIndex((prev) => (prev + 1 < item.imageCandidates.length ? prev + 1 : item.imageCandidates.length))}
      />
    );
  }

  return <ShoppingBag size={28} color={iconColor} />;
}

export const WishlistScreen: React.FC = () => {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation<any>();
  const { wishlistIds, toggleWishlist } = useOrderStore();
  const [products, setProducts] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlistItem = useCallback(async (rawId: string): Promise<WishlistItem> => {
    const id = String(rawId || '').trim();

    if (!id) {
      return {
        id: rawId,
        name: 'Product',
        description: '',
        price: 0,
        image: FLOW_FALLBACK_IMAGE_URI.shopping,
        category: '',
        inStock: true,
        flowType: 'shopping',
        imageCandidates: [FLOW_FALLBACK_IMAGE_URI.shopping].filter(Boolean),
        imageKey: FLOW_FALLBACK_IMAGE_URI.shopping,
      };
    }

    const [genericProduct, shoppingProduct, giftingProduct, printingProduct] = await Promise.all([
      productsApi.getProductById(id).catch(() => null),
      productsApi.getShoppingProduct(id).catch(() => null),
      productsApi.getGiftingProduct(id).catch(() => null),
      productsApi.getBusinessPrintProduct(id).catch(() => null),
    ]);

    const payloads: Array<{ flowHint: WishlistFlow; payload: any }> = [
      { flowHint: 'shopping', payload: shoppingProduct },
      { flowHint: 'gifting', payload: giftingProduct },
      { flowHint: 'printing', payload: printingProduct },
      { flowHint: 'shopping', payload: genericProduct },
    ];

    const flowType = resolveWishlistFlow(id, payloads);
    const primary = payloads.find(({ payload }) => payload && typeof payload === 'object')?.payload || null;
    const pricingSource = payloads
      .map(({ payload }) => payload)
      .find((payload) => {
        if (!payload) return false;
        return resolveProductPricing(payload).price > 0;
      }) || primary;
    const pricing = resolveProductPricing(pricingSource || {});

    const resolvedImage = resolveProductImageSource(
      genericProduct,
      shoppingProduct,
      giftingProduct,
      printingProduct,
    );
    const fallbackImageUri = FLOW_FALLBACK_IMAGE_URI[flowType];
    const imageCandidates = Array.from(new Set([
      ...resolvedImage.imageCandidates,
      fallbackImageUri,
    ].filter(Boolean)));
    const image = imageCandidates[0] || fallbackImageUri;

    return {
      id: String(
        primary?._id
        || primary?.id
        || genericProduct?._id
        || genericProduct?.id
        || shoppingProduct?._id
        || shoppingProduct?.id
        || giftingProduct?._id
        || giftingProduct?.id
        || printingProduct?._id
        || printingProduct?.id
        || id,
      ),
      name: pickString(
        primary?.name,
        genericProduct?.name,
        shoppingProduct?.name,
        giftingProduct?.name,
        printingProduct?.name,
        'Product',
      ),
      description: pickString(
        primary?.description,
        genericProduct?.description,
        shoppingProduct?.description,
        giftingProduct?.description,
        printingProduct?.description,
      ),
      price: pricing.price,
      originalPrice: pricing.originalPrice,
      discountLabel: pricing.discountLabel,
      image,
      category: pickString(
        typeof primary?.category === 'string' ? primary?.category : primary?.category?.slug,
        typeof primary?.subcategory === 'string' ? primary?.subcategory : primary?.subcategory?.slug,
      ),
      inStock: primary ? isCatalogProductInStock(primary) : true,
      flowType,
      imageCandidates,
      imageKey: imageCandidates.join('|'),
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (wishlistIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    Promise.all(wishlistIds.map((id) => fetchWishlistItem(id)))
      .then((results) => {
        if (cancelled) return;
        setProducts(results.filter((item) => Boolean(item?.id)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchWishlistItem, wishlistIds]);

  const onWishlistPress = useCallback((item: WishlistItem) => {
    const productId = String(item?.id || '').trim();
    if (!productId) return;

    const baseParams = {
      productId,
      name: item.name,
      image: item.image,
      price: item.price,
      originalPrice: item.originalPrice,
      discount: item.discountLabel,
    };

    if (item.flowType === 'gifting') {
      navigation.navigate('GiftTab', {
        screen: 'GiftProductDetail',
        params: {
          ...baseParams,
          flowType: 'gifting',
        },
      });
      return;
    }
<<<<<<< HEAD
    Promise.all(
      wishlistIds.map((id) =>
        isLikelyMongoId(id)
          ? productsApi
              .getProductById(id)
              .then(
                (p) => {
                  const resolvedImage = resolveProductImageSource(p);
                  return ({
                    id: p._id,
                    name: p.name,
                    description: p.description || '',
                    price: resolveProductPricing(p).price,
                    image: resolvedImage.imageUri || toAbsoluteAssetUrl(p.thumbnail || p.images?.[0]),
                    category: p.slug || '',
                    inStock: isCatalogProductInStock(p),
                  } as Product);
                },
              )
              .catch(
                () =>
                  ({
                    id,
                    name: 'Product',
                    description: '',
                    price: 0,
                    image: '',
                    category: '',
                    inStock: true,
                  } as Product),
              )
          : Promise.resolve(
              {
                id,
                name: 'Product',
                description: '',
                price: 0,
                image: '',
                category: '',
                inStock: true,
              } as Product,
            ),
      )
    ).then((results) => {
      setProducts(results.filter(Boolean) as Product[]);
      setLoading(false);
=======

    if (item.flowType === 'printing') {
      navigation.navigate('HomeTab', {
        screen: 'BusinessProductDetail',
        params: {
          ...baseParams,
          flowType: 'printing',
        },
      });
      return;
    }

    navigation.navigate('HomeTab', {
      screen: 'StationeryDetail',
      params: baseParams,
>>>>>>> 7c4c385edbfc3f2965d285e92284ebafdf41660f
    });
  }, [navigation]);

  const wishlisted = products;

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Wishlist</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={t.textPrimary} style={{ marginTop: 40 }} />
      ) : wishlistIds.length === 0 ? (
        <EmptyState type="wishlist" onAction={() => navigation.goBack()} />
      ) : (
        <FlatList
          data={wishlisted}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.card, cardShadow(), { backgroundColor: t.card }]}>
              <View style={styles.removeRow}>
                <TouchableOpacity
                  onPress={() => toggleWishlist(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.removeText, { color: t.textMuted }]}>Remove</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.cardRow} activeOpacity={0.86} onPress={() => onWishlistPress(item)}>
                <View style={[styles.thumbWrap, { backgroundColor: t.chipBg, borderColor: t.border }]}>
                  <WishlistThumbnail item={item} iconColor={t.iconDefault} />
                </View>

                <View style={styles.cardBody}>
                  <Text style={[styles.productName, { color: t.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.productDesc, { color: t.textSecondary }]}>{item.description}</Text>
                  <Text style={[styles.productMeta, { color: t.textMuted }]}>Quantity: 01 Copies</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
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
  list: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  removeRow: {
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  removeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#424242',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  productDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#6B6B6B',
    lineHeight: 18,
    minHeight: 18,
  },
  productMeta: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#424242',
    lineHeight: 18,
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
});
