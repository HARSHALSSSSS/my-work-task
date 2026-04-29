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
import { Search, ChevronLeft, LayoutGrid } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Spacing, scale } from '../../constants/theme';
import { GiftStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { dedupeProducts, getProductImageUrl, sortProducts, takeUniqueById, toAbsoluteAssetUrl } from '../../utils/product';
import { extractSearchItems, rankSearchResults } from '../../utils/search';
import { resolveProductPricing } from '../../utils/pricing';
import { formatCurrency } from '../../utils/formatCurrency';

type Nav = NativeStackNavigationProp<GiftStackParamList, 'GiftStore'>;

const IMG_DELIVERY_FAST = require('../../../assets/images/gift-delivery-fast.png');
const IMG_DELIVERY_MIDNIGHT = require('../../../assets/images/gift-delivery-midnight.png');
const IMG_GIFT_BANNER_PRIMARY = require('../../../assets/images/gift-best-roses.png');
const IMG_GIFT_BANNER_SECONDARY = require('../../../assets/images/gift-best-tulips.png');
const IMG_PROD_MUG = require('../../../assets/images/gift-prod-mug.png');

type CatItem = { id: string; label: string; color: string; image?: ImageSourcePropType };

type ProductItem = {
  id: string; name: string; price: number;
  originalPrice?: number; discount?: string;
  image: ImageSourcePropType;
};

type DeliveryCard = { id: string; label: string; image: ImageSourcePropType };
const DELIVERY_CARDS: DeliveryCard[] = [
  { id: 'd1', label: 'Fast Delivery', image: IMG_DELIVERY_FAST },
  { id: 'd2', label: 'Midnight Delivery', image: IMG_DELIVERY_MIDNIGHT },
];

function shadow(elevation = 3) {
  return Platform.select({
    ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.1, shadowRadius: 12 },
    android: { elevation: elevation + 1 },
    default: {},
  });
}

export function GiftStoreScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: t } = useThemeStore();
  const [apiCategories, setApiCategories] = useState<CatItem[]>([]);
  const [apiBestSellers, setApiBestSellers] = useState<ProductItem[]>([]);
  const [apiNewArrivals, setApiNewArrivals] = useState<ProductItem[]>([]);
  const [apiAllProducts, setApiAllProducts] = useState<ProductItem[]>([]);
  const [apiRecent, setApiRecent] = useState<ProductItem[]>([]);
  const [bannerUris, setBannerUris] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      productsApi.getGiftingHome().catch(() => null),
      productsApi.getGiftingCategories().catch(() => []),
      productsApi.getGiftingProducts({ limit: 60 }).catch(() => null),
    ])
      .then(([home, categories, productsRes]) => {
        const palette = ['#FFF0F5', '#FFF5EE', '#F0FFF0', '#FFFAF0', '#F0F9FF', '#F5F3FF'];
        const categorySeen = new Set<string>();
        const mappedCategories = (categories || [])
          .filter((c: any) => c?.isActive !== false)
          .map((c: any, idx: number) => ({
            id: c._id || c.slug || c.name,
            label: c.name || 'Category',
            color: palette[idx % palette.length],
            image: c.image ? ({ uri: toAbsoluteAssetUrl(c.image) } as ImageSourcePropType) : undefined,
          }))
          .filter((c: CatItem) => {
            const key = String(c.id || '');
            if (!key || categorySeen.has(key)) return false;
            categorySeen.add(key);
            return true;
          });
        setApiCategories(mappedCategories.length ? mappedCategories : []);

        const bannerPool = home?.banners || [];
        const bannerImages = bannerPool.map((b: any) => toAbsoluteAssetUrl(b.image)).filter(Boolean);
        setBannerUris(bannerImages);
        const mapProduct = (p: any): ProductItem => {
          const thumb = p.thumbnail || p.images?.[0];
          const { price, originalPrice, discountLabel } = resolveProductPricing(p);
          return {
            id: p._id || p.id,
            name: p.name || 'Product',
            price,
            originalPrice,
            discount: discountLabel,
            image: thumb ? { uri: toAbsoluteAssetUrl(thumb) } : IMG_PROD_MUG,
          };
        };

        const listItemsRaw: any[] = productsRes?.products || productsRes?.data || (Array.isArray(productsRes) ? productsRes : []);
        const listItems = sortProducts(dedupeProducts(listItemsRaw));
        const featured = sortProducts(dedupeProducts(home?.featured_products?.length ? home.featured_products : listItems));
        const customizable = sortProducts(dedupeProducts(home?.customizable_products?.length ? home.customizable_products : listItems));
        const premium = sortProducts(dedupeProducts(home?.premium_designs || []));

        const bestSellersPool = dedupeProducts(featured.map(mapProduct)).filter((p) => Boolean(p.id));
        const newArrivalsPool = dedupeProducts(customizable.map(mapProduct)).filter((p) => Boolean(p.id));
        const recentPoolRaw = customizable.length ? customizable : featured.length ? featured : listItems;
        const recentPool = dedupeProducts(recentPoolRaw.map(mapProduct)).filter((p) => Boolean(p.id));
        const allPool = sortProducts(dedupeProducts([...featured, ...customizable, ...premium, ...listItems]));
        const allProductsPool = dedupeProducts(allPool.map(mapProduct)).filter((p) => Boolean(p.id));

        // Keep sections mutually exclusive so one product appears once per page.
        const usedIds = new Set<string>();
        const bestSellers = takeUniqueById(bestSellersPool, usedIds);
        const newArrivals = takeUniqueById(newArrivalsPool, usedIds);
        const recent = takeUniqueById(recentPool, usedIds, 4);
        const allProducts = takeUniqueById(allProductsPool, usedIds);

        setApiBestSellers(bestSellers);
        setApiNewArrivals(newArrivals);
        setApiRecent(recent);
        setApiAllProducts(allProducts);
      })
      .catch((e) => { setLoadError(e?.message || 'Could not load gift store.'); })
      .finally(() => setLoading(false));
  }, []));

  const displayBestSellers = apiBestSellers;
  const displayNewArrivals = apiNewArrivals;
  const displayAllProducts = apiAllProducts;
  const displayRecent = apiRecent;
  const hasAnyProducts =
    displayBestSellers.length > 0 ||
    displayNewArrivals.length > 0 ||
    displayRecent.length > 0 ||
    displayAllProducts.length > 0;
  const displayCategories = apiCategories.slice(0, 10);
  const searchPool = React.useMemo(
    () => dedupeProducts([...displayAllProducts, ...displayBestSellers, ...displayNewArrivals, ...displayRecent]).filter((p) => Boolean(p.id)),
    [displayAllProducts, displayBestSellers, displayNewArrivals, displayRecent],
  );

  const mapSearchProduct = useCallback((p: any): ProductItem => {
    const thumb = getProductImageUrl(p);
    const { price, originalPrice, discountLabel } = resolveProductPricing(p);
    return {
      id: p._id || p.id,
      name: p.name || 'Product',
      price,
      originalPrice,
      discount: discountLabel,
      image: thumb ? { uri: thumb } : IMG_PROD_MUG,
    };
  }, []);

  const onProductPress = useCallback(
    (item: ProductItem) => {
      let imageUri: string | undefined;
      if (item.image && typeof item.image === 'object' && 'uri' in (item.image as any)) {
        imageUri = toAbsoluteAssetUrl((item.image as any).uri);
      } else if (typeof item.image === 'number') {
        imageUri = Image.resolveAssetSource(item.image as any)?.uri;
      }
      navigation.navigate('GiftProductDetail', {
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
      productsApi.searchGifting({ q: query })
        .then((response) => {
          if (!active) return;
          const mappedRemote = dedupeProducts(extractSearchItems<any>(response).map(mapSearchProduct))
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
  }, [search, searchPool, mapSearchProduct]);

  return (
    <SafeScreen>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Gift Store</Text>
        <TouchableOpacity style={[styles.gridBtn, { borderColor: t.border }]} activeOpacity={0.7}>
          <LayoutGrid size={20} color={t.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={t.textPrimary} />
        </View>
      )}

      {!loading && loadError && (
        <View style={styles.errorWrap}>
          <Text style={[styles.errorText, { color: t.textPrimary }]}>Couldn't load the gift store</Text>
          <Text style={[styles.errorSub, { color: t.textSecondary }]}>{loadError}</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        nestedScrollEnabled
      >

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { borderBottomColor: t.searchBorder }]}>
            <Search size={18} color={t.placeholder} />
            <TextInput
              style={[styles.searchPlaceholder, { color: t.textPrimary }]}
              placeholder="Search gifts"
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
              <View style={styles.catalogGrid}>
                {searchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.catalogCard, shadow(), { backgroundColor: t.card }]}
                    activeOpacity={0.85}
                    onPress={() => onProductPress(item)}
                  >
                    <Image source={item.image} style={styles.catalogImg} resizeMode="cover" />
                    <View style={styles.cardInfoWrap}>
                      <Text style={[styles.cardInfoName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                      <Text style={[styles.cardInfoPrice, { color: t.textPrimary }]}>{formatCurrency(item.price)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No matching gifts</Text>
                <Text style={[styles.emptySub, { color: t.textSecondary }]}>Try a different keyword.</Text>
              </View>
            )}
          </>
        ) : (
          <>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          nestedScrollEnabled
        >
          {displayCategories.map((cat) => (
            <TouchableOpacity key={cat.id} style={[styles.catCard, { backgroundColor: cat.color }]} activeOpacity={0.8}>
              <View style={styles.catImgWrap}>
                {cat.image ? (
                  <Image source={cat.image} style={styles.catImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.catImg, styles.catPlaceholder, { backgroundColor: t.card }]}>
                    <LayoutGrid size={18} color={t.placeholder} />
                  </View>
                )}
              </View>
              <Text style={[styles.catLabel, { color: t.textMuted }]} numberOfLines={2}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Best Sellers */}
        {displayBestSellers.length > 0 && <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Best seller</Text>}
        <View style={styles.catalogGrid}>
          {displayBestSellers.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.catalogCard, shadow(), { backgroundColor: t.card }]}
              activeOpacity={0.85}
              onPress={() => onProductPress(item)}
            >
              <Image source={item.image} style={styles.catalogImg} resizeMode="cover" />
              <View style={styles.cardInfoWrap}>
                <Text style={[styles.cardInfoName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.cardInfoPrice, { color: t.textPrimary }]}>{formatCurrency(item.price)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bloom & Gift Banner */}
        <View style={styles.bannerWrap}>
          <Image source={bannerUris[0] ? { uri: bannerUris[0] } : IMG_GIFT_BANNER_PRIMARY} style={styles.bannerImage} resizeMode="cover" />
        </View>

        {/* New Arrivals */}
        {displayNewArrivals.length > 0 && <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>New Arrivals</Text>}
        <View style={styles.catalogGrid}>
          {displayNewArrivals.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.catalogCard, shadow(), { backgroundColor: t.card }]}
              activeOpacity={0.85}
              onPress={() => onProductPress(item)}
            >
              <Image source={item.image} style={styles.catalogImg} resizeMode="cover" />
              <View style={styles.cardInfoWrap}>
                <Text style={[styles.cardInfoName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.cardInfoPrice, { color: t.textPrimary }]}>{formatCurrency(item.price)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Secondary Banner */}
        <View style={styles.bannerWrap}>
          <Image source={bannerUris[1] ? { uri: bannerUris[1] } : IMG_GIFT_BANNER_SECONDARY} style={styles.bannerImageLarge} resizeMode="cover" />
        </View>

        {/* Delivery Cards */}
        <View style={styles.deliveryRow}>
          {DELIVERY_CARDS.map((d) => (
            <View key={d.id} style={[styles.deliveryCard, { backgroundColor: t.card }, shadow()]}>
              <Image source={d.image} style={styles.deliveryImg} resizeMode="cover" />
              <Text style={[styles.deliveryLabel, { color: t.textPrimary }]}>{d.label}</Text>
            </View>
          ))}
        </View>

        {/* Recently Viewed */}
        {displayRecent.length > 0 && <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Recently Viewed</Text>}
        <View style={styles.catalogGrid}>
          {displayRecent.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.catalogCard, shadow(), { backgroundColor: t.card }]}
              activeOpacity={0.85}
              onPress={() => onProductPress(item)}
            >
              <Image source={item.image} style={styles.catalogImg} resizeMode="cover" />
              <View style={styles.cardInfoWrap}>
                <Text style={[styles.cardInfoName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.cardInfoPrice, { color: t.textPrimary }]}>{formatCurrency(item.price)}</Text>
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

        {/* All Products */}
        {displayAllProducts.length > 0 && <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>All Products</Text>}
        {!loading && !loadError && !hasAnyProducts && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No gift products yet</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>Check back soon for new arrivals.</Text>
          </View>
        )}
        <View style={styles.allProductsGrid}>
          {displayAllProducts.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.productCard, shadow(), { backgroundColor: t.card }]}
              activeOpacity={0.85}
              onPress={() => onProductPress(item)}
            >
              <Image source={item.image} style={styles.productImg} resizeMode="cover" />
              <View style={styles.cardInfoWrap}>
                <Text style={[styles.cardInfoName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.cardInfoPrice, { color: t.textPrimary }]}>{formatCurrency(item.price)}</Text>
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
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 8,
    paddingBottom: 100,
  },
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
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    flex: 1,
  },
  gridBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    paddingHorizontal: 2,
    height: 44,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
  },
  inlineLoadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catRow: {
    paddingHorizontal: Spacing.lg,
    gap: 10,
    paddingBottom: Spacing.md,
    paddingRight: 6,
  },
  catCard: {
    width: 80,
    minHeight: 106,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.06)',
  },
  catImgWrap: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 6,
  },
  catImg: {
    width: '100%',
    height: '100%',
  },
  catPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    textAlign: 'center',
  },
  bannerWrap: {
    marginHorizontal: Spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  bannerImage: {
    width: '100%',
    height: scale(175),
  },
  bannerImageLarge: {
    width: '100%',
    height: scale(195),
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    gap: 12,
    paddingBottom: Spacing.md,
  },
  catalogCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EAF0',
    paddingBottom: 12,
  },
  catalogImg: {
    width: '100%',
    height: scale(160),
  },
  cardInfo: {
    paddingHorizontal: 11,
    paddingTop: 10,
    gap: 4,
  },
  cardInfoName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    lineHeight: 17,
  },
  cardInfoPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },
  deliveryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 12,
    marginBottom: Spacing.lg,
  },
  deliveryCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 12,
  },
  deliveryImg: {
    width: '100%',
    height: scale(120),
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  deliveryLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    marginTop: 8,
  },
  cardInfoWrap: {
    paddingHorizontal: 11,
    paddingTop: 11,
    gap: 5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  oldPrice: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10.5,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9.5,
    color: '#00A63E',
  },
  allProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    gap: 12,
    paddingBottom: 20,
  },
  productCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EAF0',
    paddingBottom: 12,
  },
  productImg: {
    width: '100%',
    height: scale(160),
  },
  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  errorWrap: { paddingVertical: 40, paddingHorizontal: Spacing.lg, alignItems: 'center', gap: 6 },
  errorText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  errorSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, textAlign: 'center' },
  emptyWrap: { paddingVertical: 40, paddingHorizontal: Spacing.lg, alignItems: 'center', gap: 6 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 12, textAlign: 'center' },
});

