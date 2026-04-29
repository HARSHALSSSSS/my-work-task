import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet, TouchableOpacity, ActivityIndicator, View, Text, Image } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SlidersHorizontal } from 'lucide-react-native';
import { Colors, Spacing, scale } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { ProductCard } from '../../components/ui/ProductCard';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { HomeStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Product } from '../../types';
import * as productsApi from '../../api/products';
import { dedupeProducts, getProductImageCandidates, getProductImageUrl, sortProducts, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { isCatalogProductInStock } from '../../utils/stock';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'StationeryList'>;
type Route = RouteProp<HomeStackParamList, 'StationeryList'>;

const IMG_CATEGORY_BANNER = require('../../../assets/images/shop-notebooks.png');

export function StationeryListScreen() {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const category = route.params?.category;
  const routeCategoryName = route.params?.categoryName;
  const routeBannerImage = route.params?.bannerImage;

  const toggleWishlist = useOrderStore((s) => s.toggleWishlist);
  const isWishlisted = useOrderStore((s) => s.isWishlisted);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedTitle, setResolvedTitle] = useState(routeCategoryName || 'Products');
  const [bannerUri, setBannerUri] = useState<string | null>(routeBannerImage || null);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([
      productsApi.getShoppingProducts({ category: category || undefined, limit: 30 }),
      productsApi.getShoppingCategories().catch(() => []),
      productsApi.getShoppingHome().catch(() => null),
    ])
      .then(([res, categories, home]) => {
        const matchedCategory = (categories || []).find((item: any) => (
          item?.slug === category ||
          item?._id === category ||
          String(item?.name || '').toLowerCase() === String(category || '').toLowerCase()
        ));
        const nextTitle =
          routeCategoryName ||
          matchedCategory?.name ||
          (category ? category.replace(/[-_]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()) : 'Products');
        const homeBanner = (home?.banners || []).find((item: any) => item?.image)?.image;
        const nextBanner =
          routeBannerImage ||
          (matchedCategory?.image ? toAbsoluteAssetUrl(matchedCategory.image) : null) ||
          (homeBanner ? toAbsoluteAssetUrl(homeBanner) : null);
        setResolvedTitle(nextTitle);
        setBannerUri(nextBanner);

        const rawItems = res?.products || res?.data || (Array.isArray(res) ? res : []);
        const items = sortProducts(dedupeProducts(rawItems));
        return Promise.all((items || []).map(async (p: any) => {
          const productId = String(p?._id || p?.id || '').trim();
          const detailProduct = productId ? await productsApi.getShoppingProduct(productId).catch(() => null) : null;
          const source = detailProduct || p;
          const pricing = resolveProductPricing(source);
          const imageCandidates = getProductImageCandidates(source);
          const imageUri =
            imageCandidates[0] ||
            getProductImageUrl(p) ||
            (matchedCategory?.image ? toAbsoluteAssetUrl(matchedCategory.image) : '') ||
            (homeBanner ? toAbsoluteAssetUrl(homeBanner) : '');
          return {
            id: source._id || source.id || p._id || p.id,
            name: source.name || p.name,
            description: source.description || p.description || '',
            ...pricing,
            discountLabel: pricing.discountLabel,
            image: imageUri,
            thumbnail: imageCandidates[0] || imageUri,
            images: imageCandidates,
            category: typeof source.category === 'string' ? source.category : source.category?.slug || '',
            inStock: isCatalogProductInStock(source),
          };
        })).then((mappedItems) => {
          const mapped = mappedItems
            .filter((p: Product) => Boolean(p.id));
          setProducts(dedupeProducts(mapped));
        });
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, routeBannerImage, routeCategoryName]));

  const bannerSource = useMemo(() => (
    bannerUri ? { uri: bannerUri } : IMG_CATEGORY_BANNER
  ), [bannerUri]);

  const onProductPress = useCallback(
    (item: Product) => {
      navigation.navigate('StationeryDetail', {
        productId: item.id,
        image: item.image || undefined,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
      });
    },
    [navigation],
  );

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }) => (
      <ProductCard
        product={item}
        onPress={() => onProductPress(item)}
        onWishlist={() => toggleWishlist(item.id)}
        isWishlisted={isWishlisted(item.id)}
        compact
      />
    ),
    [isWishlisted, onProductPress, toggleWishlist],
  );

  return (
    <SafeScreen>
      <ScreenHeader
        title={resolvedTitle}
        onBack={() => navigation.goBack()}
        rightElement={
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <SlidersHorizontal size={24} color={t.iconDefault} />
          </View>
        }
      />

      <View style={[styles.bannerWrap, { borderColor: t.border, backgroundColor: t.card }]}>
        <Image source={bannerSource} style={styles.bannerImage} resizeMode="cover" />
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerEyebrow}>CATEGORY</Text>
          <Text style={styles.bannerTitle} numberOfLines={2}>{resolvedTitle}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={t.textPrimary} style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: t.textSecondary }]}>No products available</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  columnWrap: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    paddingTop: Spacing.sm,
    gap: 0,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  bannerWrap: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  bannerImage: {
    width: '100%',
    height: scale(118),
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(17, 24, 39, 0.16)',
  },
  bannerEyebrow: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#FFF5ED',
    marginBottom: 4,
  },
  bannerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    lineHeight: 24,
    color: '#FFFFFF',
    maxWidth: '72%',
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
});
