import React, { useCallback, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet, ActivityIndicator, View, Text, Image } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SlidersHorizontal } from 'lucide-react-native';
import { Spacing } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { ProductCard } from '../../components/ui/ProductCard';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { HomeStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Product } from '../../types';
import * as productsApi from '../../api/products';
import { dedupeProducts, resolveProductImageSource, sortProducts } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { isCatalogProductInStock } from '../../utils/stock';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'StationeryList'>;
type Route = RouteProp<HomeStackParamList, 'StationeryList'>;

const FALLBACK_STATIONERY_IMAGE_URI = Image.resolveAssetSource(
  require('../../../assets/images/shop-notebooks.png'),
)?.uri || '';

function normalizeCategoryValue(value: any): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
}

function extractProductCategoryKeys(product: any): string[] {
  const values = [
    product?.category,
    product?.category?.slug,
    product?.category?._id,
    product?.category?.name,
    product?.subcategory,
    product?.subcategory?.slug,
    product?.subcategory?._id,
    product?.subcategory?.name,
    product?.type,
    product?.business_print_type,
  ];

  return Array.from(
    new Set(
      values
        .map((value) => normalizeCategoryValue(value))
        .filter(Boolean),
    ),
  );
}

function matchesShoppingCategory(product: any, rawCategory?: string, matchedCategory?: any): boolean {
  if (!rawCategory && !matchedCategory) return true;

  const requestedKeys = Array.from(
    new Set(
      [
        rawCategory,
        matchedCategory?._id,
        matchedCategory?.slug,
        matchedCategory?.name,
      ]
        .map((value) => normalizeCategoryValue(value))
        .filter(Boolean),
    ),
  );

  if (!requestedKeys.length) return true;
  const productKeys = extractProductCategoryKeys(product);
  return requestedKeys.some((key) => productKeys.includes(key));
}

function isShoppingRootCategory(rawCategory?: string, routeCategoryName?: string, matchedCategory?: any): boolean {
  const keys = Array.from(
    new Set(
      [
        rawCategory,
        routeCategoryName,
        matchedCategory?._id,
        matchedCategory?.slug,
        matchedCategory?.name,
      ]
        .map((value) => normalizeCategoryValue(value))
        .filter(Boolean),
    ),
  );

  return keys.some((key) => key === 'shopping' || key === 'shop');
}

function extractProductItems(payload: any): any[] {
  const directPools = [payload?.products, payload?.data, payload?.items, payload?.results, payload?.rows, payload];

  for (const pool of directPools) {
    if (Array.isArray(pool)) {
      return pool.filter((item) => item && typeof item === 'object');
    }

    if (pool && typeof pool === 'object') {
      const nestedPools = [pool.products, pool.data, pool.items, pool.results, pool.rows];
      for (const nested of nestedPools) {
        if (Array.isArray(nested)) {
          return nested.filter((item) => item && typeof item === 'object');
        }
      }
    }
  }

  return [];
}

export function StationeryListScreen() {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const category = route.params?.category;
  const routeCategoryName = route.params?.categoryName;

  const toggleWishlist = useOrderStore((s) => s.toggleWishlist);
  const isWishlisted = useOrderStore((s) => s.isWishlisted);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedTitle, setResolvedTitle] = useState(routeCategoryName || 'Products');

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([
      productsApi.getShoppingProducts({ limit: 80 }),
      category ? productsApi.getShoppingProducts({ category, limit: 80 }).catch(() => null) : Promise.resolve(null),
      productsApi.getShoppingCategories().catch(() => []),
    ])
      .then(([allRes, filteredRes, categories]) => {
        const matchedCategory = (categories || []).find((item: any) => (
          item?.slug === category
          || item?._id === category
          || String(item?.name || '').toLowerCase() === String(category || '').toLowerCase()
        ));

        const nextTitle =
          routeCategoryName
          || matchedCategory?.name
          || (category ? category.replace(/[-_]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()) : 'Products');

        setResolvedTitle(nextTitle);

        const allRawItems = extractProductItems(allRes);
        const filteredRawItems = extractProductItems(filteredRes);
        const allItems = sortProducts(dedupeProducts(allRawItems));
        const useRootShoppingList = isShoppingRootCategory(category, routeCategoryName, matchedCategory);
        const filteredFromAll = useRootShoppingList
          ? allItems
          : allItems.filter((item: any) => matchesShoppingCategory(item, category, matchedCategory));
        const items = sortProducts(dedupeProducts(
          filteredFromAll.length > 0
            ? [...filteredFromAll, ...(useRootShoppingList ? [] : filteredRawItems)]
            : filteredRawItems,
        ));

        return Promise.all((items || []).map(async (p: any) => {
          if (!p || typeof p !== 'object') return null;

          const productId = String(p?._id || p?.id || '').trim();
          const listFallback = allItems.find((item: any) => String(item?._id || item?.id || '').trim() === productId) || p;
          const detailProduct = productId ? await productsApi.getShoppingProduct(productId).catch(() => null) : null;
          const source = detailProduct || listFallback || p;
          const pricing = resolveProductPricing(source);
          const { imageUri, imageCandidates } = resolveProductImageSource(source, p, listFallback);
          const mappedId = String(source?._id || source?.id || p?._id || p?.id || '').trim();

          if (!mappedId) return null;

          const mergedImageCandidates = Array.from(
            new Set([
              ...imageCandidates,
              imageUri,
              FALLBACK_STATIONERY_IMAGE_URI,
            ].filter(Boolean)),
          );
          const resolvedCardImage = mergedImageCandidates[0] || FALLBACK_STATIONERY_IMAGE_URI;

          return {
            id: mappedId,
            name: String(source?.name || p?.name || 'Product'),
            description: String(source?.description || p?.description || ''),
            ...pricing,
            discountLabel: pricing.discountLabel,
            image: resolvedCardImage,
            thumbnail: resolvedCardImage,
            images: mergedImageCandidates,
            category:
              typeof source?.category === 'string'
                ? source.category
                : String(source?.category?.slug || source?.category?.name || ''),
            inStock: isCatalogProductInStock(source),
          };
        })).then((mappedItems) => {
          const mapped = mappedItems.filter((item): item is Product => Boolean(item?.id));
          setProducts(dedupeProducts(mapped));
        });
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, routeCategoryName]));

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
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
});
