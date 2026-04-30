import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, LayoutGrid } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Spacing, scale } from '../../constants/theme';
import { HomeTabStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { dedupeProducts, resolveProductImageSource, sortProducts, takeUniqueById, toAbsoluteAssetUrl } from '../../utils/product';
import { extractSearchItems, rankSearchResults } from '../../utils/search';
import { resolveProductPricing } from '../../utils/pricing';
import { formatCurrency } from '../../utils/formatCurrency';

type Nav = NativeStackNavigationProp<HomeTabStackParamList, 'ShopByCategory'>;

const IMG_BANNER = require('../../../assets/image 2.png');
const IMG_NOTEBOOKS = require('../../../assets/images/shop-notebooks.png');

type CatItem = { id: string; label: string; categoryParam: string; imageSource?: ImageSourcePropType };
const CATEGORIES: CatItem[] = [
  { id: 'all', label: 'All', categoryParam: '' },
  { id: 'business', label: `Business${'\n'}Cards`, categoryParam: 'business-cards' },
  { id: 'flyers', label: `Flyers &${'\n'}Brochures`, categoryParam: 'flyers-brochures' },
];

type ProductItem = {
  id: string; name: string; price: number;
  originalPrice?: number; discount?: string;
  image: ImageSourcePropType;
  imageCandidates?: string[];
};

function shadow(e = 2) {
  return Platform.select({
    ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10 },
    android: { elevation: e + 1 },
    default: {},
  });
}

function resolveShoppingCategoryImage(category: any): ImageSourcePropType | undefined {
  const key = String(category?.slug || category?.name || category?._id || '').trim().toLowerCase();
  if (key.includes('print') || key.includes('document')) return undefined;
  const rawImage = String(category?.image || '').trim();
  if (!rawImage) return undefined;
  return { uri: toAbsoluteAssetUrl(rawImage) } as ImageSourcePropType;
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

function mapShoppingProductForCard(p: any): ProductItem {
  const { imageUri, imageCandidates } = resolveProductImageSource(p);
  const { price, originalPrice, discountLabel } = resolveProductPricing(p);

  return {
    id: String(p?._id || p?.id || '').trim(),
    name: p?.name || 'Product',
    price,
    originalPrice,
    discount: discountLabel,
    image: imageUri ? { uri: imageUri } : IMG_NOTEBOOKS,
    imageCandidates,
  };
}

function ShoppingProductImage({
  item,
  style,
  placeholderColor,
}: {
  item: ProductItem;
  style: any;
  placeholderColor: string;
}) {
  const candidates = React.useMemo(() => {
    if (item.imageCandidates?.length) return item.imageCandidates;
    if (item.image && typeof item.image === 'object' && 'uri' in (item.image as any)) {
      const uri = toAbsoluteAssetUrl(String((item.image as any).uri || ''));
      return uri ? [uri] : [];
    }
    return [];
  }, [item.image, item.imageCandidates]);
  const [imageIndex, setImageIndex] = React.useState(0);

  React.useEffect(() => {
    setImageIndex(0);
  }, [item.id, item.image, item.imageCandidates]);

  const activeImage = candidates[imageIndex];

  if (activeImage) {
    return (
      <Image
        source={{ uri: activeImage }}
        style={style}
        resizeMode="cover"
        onError={() => setImageIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : candidates.length))}
      />
    );
  }

  if (item.image && typeof item.image === 'number') {
    return <Image source={item.image} style={style} resizeMode="cover" />;
  }

  return (
    <View style={[style, styles.productImageFallback, { backgroundColor: placeholderColor }]}>
      <LayoutGrid size={24} color="#9CA3AF" />
    </View>
  );
}

export function ShopByCategoryScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: t } = useThemeStore();
  const [apiCategories, setApiCategories] = useState<CatItem[]>([]);
  const [apiRecent, setApiRecent] = useState<ProductItem[]>([]);
  const [apiArrivals, setApiArrivals] = useState<ProductItem[]>([]);
  const [apiSearchPool, setApiSearchPool] = useState<ProductItem[]>([]);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [searching, setSearching] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([
      productsApi.getShoppingHome().catch(() => null),
      productsApi.getShoppingCategories().catch(() => []),
      productsApi.getShoppingProducts({ limit: 40 }).catch(() => null),
    ])
      .then(([home, categories, listRes]) => {
        const categorySeen = new Set<string>();
        const mappedCategories = (categories || [])
          .filter((c: any) => c?.isActive !== false)
          .map((c: any) => ({
            id: c._id || c.slug || c.name,
            label: c.name || 'Category',
            categoryParam: c.slug || c._id || '',
            imageSource: resolveShoppingCategoryImage(c),
          }))
          .filter((c: CatItem) => {
            const key = String(c.id || '');
            if (!key || categorySeen.has(key)) return false;
            categorySeen.add(key);
            return true;
          });
        setApiCategories(
          mappedCategories.length > 0
            ? [{ id: 'all', label: 'All', categoryParam: '' }, ...mappedCategories]
            : [],
        );

        const bannerFromHome = (home?.banners || []).find((b: any) => b?.image);
        setBannerUri(
          bannerFromHome?.image ? toAbsoluteAssetUrl(bannerFromHome.image) : null,
        );

        const listItemsRaw: any[] = extractProductItems(listRes);
        const listItems = sortProducts(dedupeProducts(listItemsRaw));
        const featuredRaw: any[] = home?.featured_products?.length ? home.featured_products : listItems;
        const trendingRaw: any[] = home?.trending_products?.length ? home.trending_products : listItems;
        const featured = sortProducts(dedupeProducts(featuredRaw));
        const trending = sortProducts(dedupeProducts(trendingRaw));
        const mappedTrending = dedupeProducts(trending.map(mapShoppingProductForCard)).filter((p) => Boolean(p.id));
        const mappedFeatured = dedupeProducts(featured.map(mapShoppingProductForCard)).filter((p) => Boolean(p.id));
        const usedIds = new Set<string>();
        const uniqueRecent = takeUniqueById(mappedTrending, usedIds, 4);
        const uniqueArrivals = takeUniqueById(mappedFeatured, usedIds);
        const searchPool = dedupeProducts(listItems.map(mapShoppingProductForCard)).filter((p) => Boolean(p.id));

        setApiRecent(uniqueRecent);
        setApiArrivals(uniqueArrivals);
        setApiSearchPool(searchPool);
      })
      .catch(() => {});
  }, []));

  const displayCategories = apiCategories.length > 0 ? apiCategories : CATEGORIES;
  const displayRecent = apiRecent;
  const displayArrivals = apiArrivals;
  const searchPool = React.useMemo(
    () => dedupeProducts([...apiSearchPool, ...displayRecent, ...displayArrivals]).filter((p) => Boolean(p.id)),
    [apiSearchPool, displayRecent, displayArrivals],
  );

  const onProductPress = useCallback(
    (item: ProductItem) => {
      let imageUri: string | undefined;
      if (item.imageCandidates?.length) {
        imageUri = item.imageCandidates[0];
      } else if (item.image && typeof item.image === 'object' && 'uri' in (item.image as any)) {
        imageUri = toAbsoluteAssetUrl((item.image as any).uri);
      } else if (typeof item.image === 'number') {
        imageUri = Image.resolveAssetSource(item.image as any)?.uri;
      }
      navigation.navigate('StationeryDetail', {
        productId: item.id,
        image: imageUri,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        discount: item.discount,
      });
    },
    [navigation],
  );

  React.useEffect(() => {
    const query = search.trim();
    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }

    const localRanked = rankSearchResults(searchPool, query, 30);
    setSearchResults(localRanked);

    if (query.length < 2) {
      setSearching(false);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      productsApi.searchShopping({ q: query, limit: 20 })
        .then((response) => {
          if (!active) return;
          const mappedRemote = dedupeProducts(extractSearchItems<any>(response).map(mapShoppingProductForCard))
            .filter((p: ProductItem) => Boolean(p.id));
          const merged = dedupeProducts([...mappedRemote, ...searchPool]).filter((p) => Boolean(p.id));
          setSearchResults(rankSearchResults(merged, query, 30));
        })
        .catch(() => {
          if (active) setSearchResults(localRanked);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, searchPool]);

  return (
    <SafeScreen>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        nestedScrollEnabled
      >
        {/* Header */}
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Shopping</Text>

        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View
            style={[styles.searchBar, { borderBottomColor: t.searchBorder }]}
          >
            <Search size={18} color={t.placeholder} />
            <TextInput
              style={[styles.searchPlaceholder, { color: t.textPrimary }]}
              placeholder="Search products"
              placeholderTextColor={t.placeholder}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        </View>

        {search.trim() ? (
          <>
            <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Search Results</Text>
            {searching ? (
              <View style={styles.inlineLoadingWrap}>
                <ActivityIndicator size="small" color={t.textPrimary} />
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles.productGrid}>
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.productCard, shadow(), { backgroundColor: t.card }]}
                    activeOpacity={0.85}
                    onPress={() => onProductPress(item)}
                  >
                    <ShoppingProductImage item={item} style={styles.productImg} placeholderColor={t.chipBg} />
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                      <View style={styles.priceRow}>
                        <Text style={[styles.cardPrice, { color: t.textPrimary }]}>{formatCurrency(item.price)}</Text>
                        {item.originalPrice && (
                          <Text style={[styles.oldPrice, { color: t.placeholder }]}>{formatCurrency(item.originalPrice)}</Text>
                        )}
                        {item.discount && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{item.discount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.inlineLoadingWrap}>
                <Text style={[styles.searchPlaceholder, { color: t.textSecondary }]}>No matching products found.</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.bannerWrap}>
              <Image source={bannerUri ? { uri: bannerUri } : IMG_BANNER} style={styles.bannerImage} resizeMode="cover" />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
              nestedScrollEnabled
            >
              {displayCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catItem}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('StationeryList', {
                    category: cat.categoryParam,
                    categoryName: cat.label.replace('\n', ' '),
                    bannerImage: cat.imageSource && typeof cat.imageSource === 'object' && 'uri' in (cat.imageSource as any)
                      ? (cat.imageSource as any).uri
                      : undefined,
                  })}
                >
                  <View style={[styles.catCircle, { backgroundColor: t.chipBg }]}>
                    {cat.imageSource ? (
                      <Image source={cat.imageSource} style={styles.catImg} resizeMode="cover" />
                    ) : (
                      <LayoutGrid size={22} color={t.textPrimary} />
                    )}
                  </View>
                  <Text style={[styles.catLabel, { color: t.textMuted }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {displayRecent.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Recently Viewed</Text>
                <View style={styles.productGrid}>
                  {displayRecent.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.productCard, shadow(), { backgroundColor: t.card }]}
                      activeOpacity={0.85}
                      onPress={() => onProductPress(item)}
                    >
                      <ShoppingProductImage item={item} style={styles.productImg} placeholderColor={t.chipBg} />
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                        <View style={styles.priceRow}>
                          <Text style={[styles.cardPrice, { color: t.textPrimary }]}>{formatCurrency(item.price)}</Text>
                          {item.originalPrice && (
                            <Text style={[styles.oldPrice, { color: t.placeholder }]}>{formatCurrency(item.originalPrice)}</Text>
                          )}
                          {item.discount && (
                            <View style={styles.discountBadge}>
                              <Text style={styles.discountText}>{item.discount}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            {displayArrivals.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>New Arrivals</Text>
                <View style={styles.productGrid}>
                  {displayArrivals.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.productCard, shadow(), { backgroundColor: t.card }]}
                      activeOpacity={0.85}
                      onPress={() => onProductPress(item)}
                    >
                      <ShoppingProductImage item={item} style={styles.productImg} placeholderColor={t.chipBg} />
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                        <View style={styles.priceRow}>
                          <Text style={[styles.cardPrice, { color: t.textPrimary }]}>{formatCurrency(item.price)}</Text>
                          {item.originalPrice && (
                            <Text style={[styles.oldPrice, { color: t.placeholder }]}>{formatCurrency(item.originalPrice)}</Text>
                          )}
                          {item.discount && (
                            <View style={styles.discountBadge}>
                              <Text style={styles.discountText}>{item.discount}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 6,
    paddingBottom: 100,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18.5,
    lineHeight: 24,
    textAlign: 'center',
    paddingTop: 4,
    paddingBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    paddingHorizontal: 2,
    minHeight: 44,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inlineLoadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  bannerWrap: {
    marginHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  bannerImage: {
    width: '100%',
    height: scale(132),
  },
  catRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    paddingRight: 6,
  },
  catItem: {
    alignItems: 'center',
    gap: 6,
    width: 82,
    minHeight: 100,
  },
  catCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catImg: {
    width: '100%',
    height: '100%',
  },
  catLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    rowGap: 12,
    columnGap: 10,
    marginBottom: 14,
  },
  productCard: {
    width: '48%',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 0.8,
    borderColor: '#E8DED9',
    paddingBottom: 12,
  },
  productImg: {
    width: '100%',
    height: scale(126),
  },
  productImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 5,
  },
  cardName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11.5,
    lineHeight: 16,
  },
  cardPrice: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 1,
  },
  oldPrice: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 9.5,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  discountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8,
    color: '#00A63E',
  },
});

