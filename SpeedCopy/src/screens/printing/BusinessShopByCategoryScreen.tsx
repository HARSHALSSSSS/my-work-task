import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Search, ArrowRight, FileText } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { dedupeProducts, getProductImageUrl, mergeProductImageCandidates, sortProducts, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { Radii, Spacing, Typography, scale } from '../../constants/theme';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'BusinessShopByCategory'>;

type DesignProduct = {
  id: string;
  name: string;
  category: string;
  hasPremium: boolean;
  thumbnail?: string;
  imageCandidates?: string[];
  price?: number;
  originalPrice?: number;
  discount?: string;
};

type ActionCard = {
  id: string;
  action: 'premium' | 'start';
  product: DesignProduct;
};

function BusinessProductImage({
  item,
  placeholderColor,
  iconColor,
}: {
  item: DesignProduct;
  placeholderColor: string;
  iconColor: string;
}) {
  const candidates = React.useMemo(
    () => (item.imageCandidates?.length ? item.imageCandidates : item.thumbnail ? [toAbsoluteAssetUrl(item.thumbnail)] : []),
    [item.imageCandidates, item.thumbnail],
  );
  const [imageIndex, setImageIndex] = React.useState(0);

  React.useEffect(() => {
    setImageIndex(0);
  }, [item.id, item.thumbnail, item.imageCandidates]);

  const activeImage = candidates[imageIndex];

  return (
    <View style={[styles.productImageWrap, { backgroundColor: placeholderColor }]}>
      {activeImage ? (
        <Image
          source={{ uri: activeImage }}
          style={styles.productImage}
          resizeMode="cover"
          onError={() => setImageIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : candidates.length))}
        />
      ) : (
        <FileText size={40} color={iconColor} />
      )}
    </View>
  );
}

export const BusinessShopByCategoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { colors: t } = useThemeStore();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<DesignProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedProductId = route.params?.productId as string | undefined;
  const selectedProductName = route.params?.name as string | undefined;
  const selectedProductImage = route.params?.image as string | undefined;
  const selectedProductPrice = route.params?.price as number | undefined;
  const selectedProductOriginalPrice = route.params?.originalPrice as number | undefined;
  const selectedProductDiscount = route.params?.discount as string | undefined;

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([
        productsApi.getBusinessPrintProducts({ limit: 40 }).catch(() => null),
        selectedProductId ? productsApi.getBusinessPrintProduct(selectedProductId).catch(() => null) : Promise.resolve(null),
      ])
        .then(([productsRes, selectedProductRes]) => {
          const rawItems = productsRes?.products || productsRes?.data || (Array.isArray(productsRes) ? productsRes : []);
          const selectedItems = selectedProductRes ? [selectedProductRes] : [];
          const routeFallbackItems = selectedProductId
            ? [{
              _id: selectedProductId,
              id: selectedProductId,
              name: selectedProductName,
              thumbnail: selectedProductImage,
              images: selectedProductImage ? [selectedProductImage] : [],
              category: route.params?.category || 'Business',
              basePrice: selectedProductPrice,
              discountedPrice: selectedProductPrice,
              mrp: selectedProductOriginalPrice,
              discountLabel: selectedProductDiscount,
            }]
            : [];

          const items = sortProducts(dedupeProducts([...selectedItems, ...routeFallbackItems, ...rawItems]));

          return Promise.all(items.map(async (p: any) => {
            const productId = String(p?._id || p?.id || '').trim();
            const detailProduct = productId ? await productsApi.getBusinessPrintProduct(productId).catch(() => null) : null;
            const source = detailProduct || p;
            const { price, originalPrice, discountLabel } = resolveProductPricing(source);
            const imageCandidates = mergeProductImageCandidates(source, p);
            return {
              id: source._id || source.id || p._id || p.id,
              name: source.name || p.name || 'Business Product',
              category: typeof source.category === 'object' ? source.category?.name : source.category || p.category || 'Business',
              hasPremium: Boolean(source.isFeatured || source.is_featured || source.designType === 'premium' || p.isFeatured || p.is_featured),
              thumbnail: imageCandidates[0] || getProductImageUrl(source) || getProductImageUrl(p),
              imageCandidates,
              price,
              originalPrice,
              discount: discountLabel,
            } satisfies DesignProduct;
          })).then((mappedItems) => {
            const mapped = mappedItems.filter((item) => Boolean(item.id));
            const uniqueProducts = dedupeProducts(mapped);

            if (selectedProductId) {
              const selectedOnly = uniqueProducts.filter((item) => item.id === selectedProductId);
              if (selectedOnly.length > 0) {
                setProducts(selectedOnly);
              } else if (selectedProductName || selectedProductImage) {
                setProducts([
                  {
                    id: selectedProductId,
                    name: selectedProductName || 'Business Product',
                    category: route.params?.category || 'Business',
                    hasPremium: false,
                    thumbnail: selectedProductImage,
                    imageCandidates: selectedProductImage ? [toAbsoluteAssetUrl(selectedProductImage)] : [],
                    price: selectedProductPrice,
                    originalPrice: selectedProductOriginalPrice,
                    discount: selectedProductDiscount,
                  },
                ]);
              } else {
                setProducts([]);
              }
            } else {
              setProducts(uniqueProducts);
            }
            setLoading(false);
          });
        })
        .catch(() => {
          setProducts([]);
          setLoading(false);
        });
    }, [
      route.params?.category,
      selectedProductDiscount,
      selectedProductId,
      selectedProductImage,
      selectedProductName,
      selectedProductOriginalPrice,
      selectedProductPrice,
    ]),
  );

  const filteredProducts = useMemo(() => {
    let list = products;
    const keyword = query.trim().toLowerCase();
    if (keyword) {
      list = list.filter((item) => item.name.toLowerCase().includes(keyword));
    }
    return list;
  }, [products, query]);

  const actionCards = useMemo<ActionCard[]>(() => {
    return filteredProducts.flatMap((product) => ([
      { id: `${product.id}-premium`, action: 'premium', product },
      { id: `${product.id}-start`, action: 'start', product },
    ]));
  }, [filteredProducts]);

  const onExplorePremiumPress = useCallback((item: DesignProduct) => {
    navigation.navigate('BusinessPremiumDesigns', {
      productId: item.id,
      image: item.thumbnail,
      name: item.name,
      category: item.category,
      price: item.price,
      originalPrice: item.originalPrice,
      discount: item.discount,
    });
  }, [navigation]);

  const onStartDesignPress = useCallback((item: DesignProduct) => {
    navigation.navigate('PrintCustomize', {
      productId: item.id,
      flowType: 'printing',
      image: item.thumbnail,
      name: item.name,
    });
  }, [navigation]);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSlot} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Shop by category</Text>
        <View style={styles.headerSlot} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.searchRow, { backgroundColor: t.inputBg, borderColor: t.searchBorder }]}>
          <Search size={18} color={t.placeholder} />
          <TextInput
            style={[styles.searchInput, { color: t.textPrimary }]}
            placeholder="Search"
            placeholderTextColor={t.placeholder}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={t.textPrimary} />
          </View>
        ) : actionCards.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No product found</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>Try another filter or search keyword.</Text>
          </View>
        ) : (
          <View style={styles.productBlock}>
            {actionCards.map((card) => (
              <View key={card.id} style={[styles.actionCard, { backgroundColor: t.card, borderColor: t.divider }]}>
                <BusinessProductImage item={card.product} placeholderColor={t.chipBg} iconColor={t.iconDefault} />
                <TouchableOpacity
                  style={[styles.singleActionBtn, { backgroundColor: t.textPrimary }]}
                  onPress={() => (card.action === 'premium' ? onExplorePremiumPress(card.product) : onStartDesignPress(card.product))}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.singleActionText, { color: t.background }]} numberOfLines={1}>
                    {card.action === 'premium' ? 'Explore Premium designs' : 'Start design'}
                  </Text>
                  <ArrowRight size={14} color={t.background} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
    minHeight: 48,
    gap: Spacing.sm,
  },
  headerSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.title,
    textAlign: 'center',
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    gap: Spacing.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    ...Typography.subtitle,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptySub: {
    ...Typography.caption,
    textAlign: 'center',
  },
  productBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    columnGap: 12,
  },
  actionCard: {
    width: '47.8%',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  productImageWrap: {
    width: '100%',
    height: scale(152),
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  singleActionBtn: {
    margin: 10,
    borderRadius: Radii.button,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  singleActionText: {
    ...Typography.small,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10.5,
    lineHeight: 14,
    flexShrink: 1,
  },
});
