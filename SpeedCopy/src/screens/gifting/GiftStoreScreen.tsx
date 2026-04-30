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
import { Search, ChevronLeft, Grid2x2, Clock3, Gift } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Spacing, scale } from '../../constants/theme';
import { GiftStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { dedupeProducts, getProductImageUrl, getProductImageCandidates, mergeProductImageCandidates, sortProducts, takeUniqueById, toAbsoluteAssetUrl } from '../../utils/product';
import { extractSearchItems, rankSearchResults } from '../../utils/search';
import { resolveProductPricing } from '../../utils/pricing';
import { formatCurrency } from '../../utils/formatCurrency';

type Nav = NativeStackNavigationProp<GiftStackParamList, 'GiftStore'>;

const IMG_DELIVERY_FAST = require('../../../assets/images/gift-delivery-fast.png');
const IMG_DELIVERY_MIDNIGHT = require('../../../assets/images/gift-delivery-midnight.png');
const IMG_GIFT_BANNER_PRIMARY = require('../../../assets/images/gift-best-roses.png');
const IMG_GIFT_BANNER_SECONDARY = require('../../../assets/images/gift-best-tulips.png');
const IMG_PROD_MUG = require('../../../assets/images/gift-prod-mug.png');

type CatItem = {
  id: string;
  label: string;
  color: string;
  image?: ImageSourcePropType;
  categoryParam?: string;
};

type ProductItem = {
  id: string; name: string; price: number;
  originalPrice?: number; discount?: string;
  image: ImageSourcePropType;
  imageCandidates?: string[];
  fallbackImage?: ImageSourcePropType;
};

type DeliveryCard = { id: string; label: string; image: ImageSourcePropType };
const DELIVERY_CARDS: DeliveryCard[] = [
  { id: 'd1', label: 'Fast Delivery', image: IMG_DELIVERY_FAST },
  { id: 'd2', label: 'Midnight Delivery', image: IMG_DELIVERY_MIDNIGHT },
];

const CATEGORY_LIMIT = 8;

function shadow(elevation = 3) {
  return Platform.select({
    ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.1, shadowRadius: 12 },
    android: { elevation: elevation + 1 },
    default: {},
  });
}

function GiftStoreProductImage({
  item,
  style,
  placeholderColor,
  iconColor,
}: {
  item: ProductItem;
  style: any;
  placeholderColor: string;
  iconColor: string;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const imageCandidates = React.useMemo(() => item.imageCandidates || [], [item.imageCandidates]);

  React.useEffect(() => {
    setImageIndex(0);
  }, [item.id, item.image, item.imageCandidates]);

  const activeImage = imageCandidates[imageIndex];

  if (activeImage) {
    return (
      <Image
        source={{ uri: activeImage }}
        style={style}
        resizeMode="cover"
        onError={() => setImageIndex((prev) => (prev + 1 < imageCandidates.length ? prev + 1 : imageCandidates.length))}
      />
    );
  }

  if (item.fallbackImage) {
    return <Image source={item.fallbackImage} style={style} resizeMode="cover" />;
  }

  if (item.image && imageCandidates.length === 0) {
    return <Image source={item.image} style={style} resizeMode="cover" />;
  }

  return (
    <View style={[style, styles.productImageFallback, { backgroundColor: placeholderColor }]}>
      <Gift size={34} color={iconColor} />
    </View>
  );
}

export function GiftStoreScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: t, mode } = useThemeStore();
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
  const openingCategoryId: string | null = null;

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      productsApi.getGiftingHome().catch(() => null),
      productsApi.getGiftingCategories().catch(() => []),
      productsApi.getGiftingProducts({ limit: 60 }).catch(() => null),
    ])
      .then(async ([home, categories, productsRes]) => {
        const palette = ['#FFF0F5', '#FFF5EE', '#F0FFF0', '#FFFAF0', '#F0F9FF', '#F5F3FF'];
        const categorySeen = new Set<string>();
        const listItemsRaw: any[] = productsRes?.products || productsRes?.data || (Array.isArray(productsRes) ? productsRes : []);
        const listItems = sortProducts(dedupeProducts(listItemsRaw));
        const enrichProduct = async (p: any): Promise<ProductItem> => {
          const productId = String(p?._id || p?.id || '').trim();
          const baseImageCandidates = getProductImageCandidates(p);
          const detailProduct =
            productId && baseImageCandidates.length <= 1
              ? await productsApi.getGiftingProduct(productId).catch(() => null)
              : null;
          const source = detailProduct || p;
          const imageCandidates = mergeProductImageCandidates(source, p);
          const thumb = imageCandidates[0] || getProductImageUrl(source) || getProductImageUrl(p);
          const { price, originalPrice, discountLabel } = resolveProductPricing(source);
          return {
            id: source?._id || source?.id || p?._id || p?.id,
            name: source?.name || p?.name || 'Product',
            price,
            originalPrice,
            discount: discountLabel,
            image: thumb ? { uri: thumb } : IMG_PROD_MUG,
            imageCandidates,
            fallbackImage: IMG_PROD_MUG,
          };
        };

        const mappedCategories = (categories || [])
          .filter((c: any) => c?.isActive !== false)
          .map((c: any, idx: number) => ({
            id: c._id || c.slug || c.name,
            label: c.name || 'Category',
            color: palette[idx % palette.length],
            image: c.image ? ({ uri: toAbsoluteAssetUrl(c.image) } as ImageSourcePropType) : undefined,
            categoryParam: c.slug || c._id || c.name,
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
        const featured = sortProducts(dedupeProducts(home?.featured_products?.length ? home.featured_products : listItems));
        const customizable = sortProducts(dedupeProducts(home?.customizable_products?.length ? home.customizable_products : listItems));
        const premium = sortProducts(dedupeProducts(home?.premium_designs || []));
        const recentPoolRaw = customizable.length ? customizable : featured.length ? featured : listItems;
        const allPool = sortProducts(dedupeProducts([...featured, ...customizable, ...premium, ...listItems]));
        const enrichedProducts = (await Promise.all(allPool.map((item) => enrichProduct(item)))).filter((item) => Boolean(item.id));
        const productsById = new Map(enrichedProducts.map((item) => [String(item.id), item] as const));
        const mapPoolProducts = (items: any[]): ProductItem[] => (
          dedupeProducts(
            items
              .map((item) => productsById.get(String(item?._id || item?.id || '').trim()))
              .filter(Boolean) as ProductItem[],
          ).filter((item) => Boolean(item.id))
        );

        const bestSellersPool = mapPoolProducts(featured);
        const newArrivalsPool = mapPoolProducts(customizable);
        const recentPool = mapPoolProducts(recentPoolRaw);
        const allProductsPool = dedupeProducts(enrichedProducts);

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
  const displayCategories = apiCategories.slice(0, CATEGORY_LIMIT);
  const searchPool = React.useMemo(
    () => dedupeProducts([...displayAllProducts, ...displayBestSellers, ...displayNewArrivals, ...displayRecent]).filter((p) => Boolean(p.id)),
    [displayAllProducts, displayBestSellers, displayNewArrivals, displayRecent],
  );

  const mapSearchProduct = useCallback((p: any): ProductItem => {
    const imageCandidates = getProductImageCandidates(p);
    const thumb = imageCandidates[0] || getProductImageUrl(p);
    const { price, originalPrice, discountLabel } = resolveProductPricing(p);
    return {
      id: p._id || p.id,
      name: p.name || 'Product',
      price,
      originalPrice,
      discount: discountLabel,
      image: thumb ? { uri: thumb } : IMG_PROD_MUG,
      imageCandidates,
      fallbackImage: IMG_PROD_MUG,
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

  const onCategoryPress = useCallback((cat: CatItem) => {
    const categoryParam = String(cat.categoryParam || cat.id || cat.label || '').trim();
    if (!categoryParam) return;

    let bannerImage: string | undefined;
    if (cat.image && typeof cat.image === 'object' && 'uri' in (cat.image as any)) {
      bannerImage = toAbsoluteAssetUrl((cat.image as any).uri);
    }

    navigation.navigate('GiftShopByCategory', {
      category: categoryParam,
      categoryName: cat.label,
      bannerImage,
    });
  }, [navigation]);

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
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Gift Store</Text>
        <TouchableOpacity style={[styles.headerIconBtn, styles.gridBtn, { borderColor: t.border }]} activeOpacity={0.7}>
          <Grid2x2 size={18} color={t.textPrimary} />
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
                    style={[styles.catalogCard, shadow(), { backgroundColor: t.card, borderColor: t.border }]}
                    activeOpacity={0.85}
                    onPress={() => onProductPress(item)}
                  >
                    <GiftStoreProductImage
                      item={item}
                      style={styles.catalogImg}
                      placeholderColor={t.chipBg}
                      iconColor={t.placeholder}
                    />
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
        <View style={styles.categoryGrid}>
          {displayCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catCard,
                {
                  backgroundColor: mode === 'dark' ? t.card : cat.color,
                  borderColor: mode === 'dark' ? t.border : 'rgba(17,24,39,0.05)',
                },
              ]}
              activeOpacity={0.82}
              onPress={() => onCategoryPress(cat)}
            >
              <View
                style={[
                  styles.catImgWrap,
                  {
                    backgroundColor: mode === 'dark' ? t.surface : '#FFFFFF',
                    borderColor: mode === 'dark' ? t.border : 'rgba(17,24,39,0.05)',
                  },
                ]}
              >
                {cat.image ? (
                  <Image source={cat.image} style={styles.catImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.catImg, styles.catPlaceholder, { backgroundColor: mode === 'dark' ? t.surface : '#FFFFFF' }]}>
                    <Grid2x2 size={16} color={t.placeholder} />
                  </View>
                )}
              </View>
              {openingCategoryId === cat.id ? (
                <ActivityIndicator size="small" color={t.textPrimary} style={styles.catLoading} />
              ) : null}
              <Text style={[styles.catLabel, { color: t.textPrimary }]} numberOfLines={2}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Best Sellers */}
        {displayBestSellers.length > 0 && <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Best seller</Text>}
        <View style={styles.catalogGrid}>
          {displayBestSellers.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.catalogCard, shadow(), { backgroundColor: t.card, borderColor: t.border }]}
              activeOpacity={0.85}
              onPress={() => onProductPress(item)}
            >
              <GiftStoreProductImage
                item={item}
                style={styles.catalogImg}
                placeholderColor={t.chipBg}
                iconColor={t.placeholder}
              />
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
          <View style={[styles.bannerOverlay, { backgroundColor: mode === 'dark' ? 'rgba(18,18,18,0.38)' : 'rgba(255, 221, 223, 0.14)' }]}>
            <Text style={[styles.bannerKicker, { color: mode === 'dark' ? '#F6D9D7' : '#83503D' }]}>FLOWER</Text>
            <Text style={[styles.bannerTitle, { color: mode === 'dark' ? '#FFF5F3' : '#5B2C2F' }]}>Bloom & Gift</Text>
            <Text style={[styles.bannerSub, { color: mode === 'dark' ? '#F0D9D4' : '#704A4C' }]}>Crafted bouquets and keepsakes for warm, memorable gifting.</Text>
          </View>
        </View>

        {/* New Arrivals */}
        {displayNewArrivals.length > 0 && <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>New Arrivals</Text>}
        <View style={styles.catalogGrid}>
          {displayNewArrivals.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.catalogCard, shadow(), { backgroundColor: t.card, borderColor: t.border }]}
              activeOpacity={0.85}
              onPress={() => onProductPress(item)}
            >
              <GiftStoreProductImage
                item={item}
                style={styles.catalogImg}
                placeholderColor={t.chipBg}
                iconColor={t.placeholder}
              />
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
        <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Shop by delivery type</Text>
        <View style={styles.deliveryRow}>
          {DELIVERY_CARDS.map((d) => (
            <View key={d.id} style={[styles.deliveryCard, { backgroundColor: t.card, borderColor: t.border }, shadow()]}>
              <Image source={d.image} style={styles.deliveryImg} resizeMode="cover" />
              <Text style={[styles.deliveryLabel, { color: t.textPrimary }]}>{d.label}</Text>
            </View>
          ))}
        </View>

        {/* Recently Viewed */}
        {displayRecent.length > 0 && (
          <View style={styles.recentHeader}>
            <Text style={[styles.sectionTitleCompact, { color: t.textPrimary }]}>Recently Viewed</Text>
            <Clock3 size={15} color={t.placeholder} />
          </View>
        )}
        <View style={styles.catalogGrid}>
          {displayRecent.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.catalogCard, shadow(), { backgroundColor: t.card, borderColor: t.border }]}
              activeOpacity={0.85}
              onPress={() => onProductPress(item)}
            >
              <GiftStoreProductImage
                item={item}
                style={styles.catalogImg}
                placeholderColor={t.chipBg}
                iconColor={t.placeholder}
              />
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
              style={[styles.productCard, shadow(), { backgroundColor: t.card, borderColor: t.border }]}
              activeOpacity={0.85}
              onPress={() => onProductPress(item)}
            >
              <GiftStoreProductImage
                item={item}
                style={styles.productImg}
                placeholderColor={t.chipBg}
                iconColor={t.placeholder}
              />
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
    paddingTop: 6,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    minHeight: 52,
    gap: 10,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18.5,
    lineHeight: 24,
    textAlign: 'center',
    flex: 1,
  },
  gridBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
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
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    rowGap: 10,
    columnGap: 10,
    paddingBottom: 16,
  },
  catCard: {
    width: 92,
    height: 96,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 0.8,
    borderColor: 'rgba(17,24,39,0.05)',
  },
  catImgWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
    borderWidth: 1,
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
    lineHeight: 12,
    textAlign: 'center',
  },
  catLoading: {
    marginBottom: 4,
  },
  bannerWrap: {
    marginHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    marginTop: 4,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: scale(144),
  },
  bannerImageLarge: {
    width: '100%',
    height: scale(108),
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  bannerKicker: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 2,
  },
  bannerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 4,
  },
  bannerSub: {
    maxWidth: '62%',
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    lineHeight: 14,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 2,
    textTransform: 'none',
  },
  sectionTitleCompact: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    rowGap: 12,
    columnGap: 10,
    paddingBottom: 14,
  },
  catalogCard: {
    width: '48%',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 0.8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  catalogImg: {
    width: '100%',
    height: scale(126),
  },
  productImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfoName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11.5,
    lineHeight: 16,
  },
  cardInfoPrice: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
  },
  deliveryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  deliveryCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 8,
    borderWidth: 0.8,
  },
  deliveryImg: {
    width: '100%',
    height: scale(96),
  },
  deliveryLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    marginTop: 7,
  },
  cardInfoWrap: {
    paddingHorizontal: 8,
    paddingTop: 7,
    gap: 3,
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
    fontSize: 9,
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
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 2,
  },
  allProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    rowGap: 12,
    columnGap: 10,
    paddingBottom: 20,
  },
  productCard: {
    width: '48%',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 0.8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  productImg: {
    width: '100%',
    height: scale(130),
  },
  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  errorWrap: { paddingVertical: 40, paddingHorizontal: Spacing.lg, alignItems: 'center', gap: 6 },
  errorText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  errorSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, textAlign: 'center' },
  emptyWrap: { paddingVertical: 40, paddingHorizontal: Spacing.lg, alignItems: 'center', gap: 6 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 12, textAlign: 'center' },
});

