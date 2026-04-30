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
import { HeroBannerCarousel, HeroBannerSlide } from '../../components/ui/HeroBannerCarousel';
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
const IMG_CAT_BIRTHDAY = require('../../../assets/images/gift-cat-birthday.png');
const IMG_CAT_ANNIVERSARY = require('../../../assets/images/gift-cat-anniversary.png');
const IMG_CAT_CHOCOLATE = require('../../../assets/images/gift-cat-chocolate.png');
const IMG_CAT_WEDDING = require('../../../assets/images/gift-cat-wedding.png');
const IMG_CAT_CELEBRATION = require('../../../assets/images/gift-cat-celebration.png');
const IMG_PROD_MUG = require('../../../assets/images/gift-prod-mug.png');

type CatItem = {
  id: string;
  label: string;
  color: string;
  image?: ImageSourcePropType;
  fallbackImage?: ImageSourcePropType;
  categoryParam?: string;
};

type ProductItem = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  image: ImageSourcePropType;
  imageCandidates?: string[];
  fallbackImage?: ImageSourcePropType;
};

type DeliveryCard = { id: string; label: string; image: ImageSourcePropType; subtitle: string };
const DELIVERY_CARDS: DeliveryCard[] = [
  { id: 'd1', label: 'Fast Delivery', subtitle: 'Within hours', image: IMG_DELIVERY_FAST },
  { id: 'd2', label: 'Midnight Delivery', subtitle: '12 AM surprise', image: IMG_DELIVERY_MIDNIGHT },
];

const CATEGORY_LIMIT = 8;

function shadow(elevation = 2) {
  return Platform.select({
    ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 10 },
    android: { elevation },
    default: {},
  });
}

function resolveCategoryFallbackImage(label: string): ImageSourcePropType {
  const key = String(label || '').toLowerCase();
  if (key.includes('birthday')) return IMG_CAT_BIRTHDAY;
  if (key.includes('anniversary')) return IMG_CAT_ANNIVERSARY;
  if (key.includes('chocolate')) return IMG_CAT_CHOCOLATE;
  if (key.includes('wedding')) return IMG_CAT_WEDDING;
  return IMG_CAT_CELEBRATION;
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
      <Gift size={28} color={iconColor} />
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
  const [failedCategoryImages, setFailedCategoryImages] = useState<Record<string, boolean>>({});

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
          .map((c: any, idx: number) => {
            const label = c.name || 'Category';
            return {
              id: c._id || c.slug || c.name,
              label,
              color: palette[idx % palette.length],
              image: c.image ? ({ uri: toAbsoluteAssetUrl(c.image) } as ImageSourcePropType) : undefined,
              fallbackImage: resolveCategoryFallbackImage(label),
              categoryParam: c.slug || c._id || c.name,
            };
          })
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

  const heroBannerSlides = React.useMemo<HeroBannerSlide[]>(() => {
    if (bannerUris.length > 0) {
      return bannerUris.map((uri, index) => ({
        id: `gift-banner-${index}`,
        image: { uri },
      }));
    }

    return [
      {
        id: 'gift-fallback-primary',
        image: IMG_GIFT_BANNER_PRIMARY,
        overlay: (
          <View style={[styles.primaryBannerOverlay, { backgroundColor: mode === 'dark' ? 'rgba(8,10,16,0.32)' : 'rgba(70, 38, 45, 0.18)' }]}>
            <Text style={styles.primaryBannerKicker}>FEATURED</Text>
            <Text style={styles.primaryBannerTitle}>Bloom & Gift</Text>
            <Text style={styles.primaryBannerSub}>Premium bouquets and keepsakes for every celebration.</Text>
          </View>
        ),
      },
      {
        id: 'gift-fallback-secondary',
        image: IMG_GIFT_BANNER_SECONDARY,
      },
    ];
  }, [bannerUris, mode]);

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

  const renderProductCard = (item: ProductItem, variant: 'grid' | 'rail' = 'grid') => {
    const isGrid = variant === 'grid';

    return (
      <TouchableOpacity
        key={`${variant}-${item.id}`}
        style={[
          isGrid ? styles.gridProductCard : styles.railProductCard,
          shadow(isGrid ? 2 : 1),
          { backgroundColor: t.card, borderColor: t.border },
        ]}
        activeOpacity={0.88}
        onPress={() => onProductPress(item)}
      >
        <GiftStoreProductImage
          item={item}
          style={isGrid ? styles.gridProductImage : styles.railProductImage}
          placeholderColor={t.chipBg}
          iconColor={t.placeholder}
        />
        <View style={styles.productMeta}>
          <Text style={[styles.productName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.productPrice, { color: t.textPrimary }]}>{formatCurrency(item.price)}</Text>
            {item.originalPrice ? (
              <Text style={[styles.productOldPrice, { color: t.placeholder }]}>{formatCurrency(item.originalPrice)}</Text>
            ) : null}
            {item.discount ? (
              <View style={[styles.discountBadge, { backgroundColor: t.badgeBg }]}>
                <Text style={[styles.discountText, { color: mode === 'dark' ? '#83E49A' : '#00A63E' }]}>{item.discount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const searchingState = search.trim().length > 0;

  return (
    <SafeScreen>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={22} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Gift Store</Text>
        <TouchableOpacity style={[styles.headerIconBtn, styles.gridBtn, { borderColor: t.border, backgroundColor: t.card }]} activeOpacity={0.7}>
          <Grid2x2 size={17} color={t.textPrimary} />
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
        <View style={[styles.searchWrap, { backgroundColor: t.card, borderColor: t.border }]}>
          <Search size={17} color={t.placeholder} />
          <TextInput
            style={[styles.searchInput, { color: t.textPrimary }]}
            placeholder="Search gifts"
            placeholderTextColor={t.placeholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {searchingState ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Search results</Text>
            </View>
            {searching ? (
              <View style={styles.inlineLoadingWrap}>
                <ActivityIndicator size="small" color={t.textPrimary} />
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles.productGrid}>
                {searchResults.map((item) => renderProductCard(item, 'grid'))}
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
            <View style={styles.topCluster}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryStrip}
                nestedScrollEnabled
              >
                {displayCategories.map((cat) => {
                  const categoryImage = failedCategoryImages[cat.id] ? cat.fallbackImage : (cat.image || cat.fallbackImage);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryCard,
                        {
                          backgroundColor: mode === 'dark' ? t.card : cat.color,
                          borderColor: mode === 'dark' ? t.border : 'rgba(17,24,39,0.08)',
                        },
                      ]}
                      activeOpacity={0.86}
                      onPress={() => onCategoryPress(cat)}
                    >
                      <View
                        style={[
                          styles.categoryThumb,
                          {
                            backgroundColor: mode === 'dark' ? t.surface : '#FFFFFF',
                            borderColor: mode === 'dark' ? t.border : 'rgba(17,24,39,0.08)',
                          },
                        ]}
                      >
                        {categoryImage ? (
                          <Image
                            source={categoryImage}
                            style={styles.categoryImg}
                            resizeMode="cover"
                            onError={() => setFailedCategoryImages((prev) => ({ ...prev, [cat.id]: true }))}
                          />
                        ) : (
                          <View style={[styles.categoryImg, styles.catPlaceholder, { backgroundColor: mode === 'dark' ? t.surface : '#FFFFFF' }]}>
                            <Grid2x2 size={14} color={t.placeholder} />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.categoryLabel, { color: t.textPrimary }]} numberOfLines={2}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <HeroBannerCarousel
                slides={heroBannerSlides}
                height={scale(182)}
                gap={10}
                style={styles.heroBannerWrap}
                cardStyle={[styles.heroBannerCard, { backgroundColor: t.card, borderColor: t.border }]}
              />
            </View>

            {displayBestSellers.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Best sellers</Text>
              </View>
            ) : null}
            <View style={styles.productGrid}>
              {displayBestSellers.map((item) => renderProductCard(item, 'grid'))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Shop by delivery type</Text>
            </View>
            <View style={styles.deliveryRow}>
              {DELIVERY_CARDS.map((delivery) => (
                <View
                  key={delivery.id}
                  style={[styles.deliveryCard, shadow(1), { backgroundColor: t.card, borderColor: t.border }]}
                >
                  <Image source={delivery.image} style={styles.deliveryImage} resizeMode="cover" />
                  <View style={styles.deliveryMeta}>
                    <Text style={[styles.deliveryLabel, { color: t.textPrimary }]}>{delivery.label}</Text>
                    <Text style={[styles.deliverySub, { color: t.textSecondary }]}>{delivery.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>

            {displayNewArrivals.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>New arrivals</Text>
              </View>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRail} nestedScrollEnabled>
              {displayNewArrivals.map((item) => renderProductCard(item, 'rail'))}
            </ScrollView>

            {displayRecent.length > 0 ? (
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Recently viewed</Text>
                <Clock3 size={14} color={t.placeholder} />
              </View>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRail} nestedScrollEnabled>
              {displayRecent.map((item) => renderProductCard(item, 'rail'))}
            </ScrollView>

            {displayAllProducts.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>More to explore</Text>
              </View>
            ) : null}
            {!loading && !loadError && !hasAnyProducts ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No gift products yet</Text>
                <Text style={[styles.emptySub, { color: t.textSecondary }]}>Check back soon for new arrivals.</Text>
              </View>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRail} nestedScrollEnabled>
              {displayAllProducts.map((item) => renderProductCard(item, 'rail'))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 2,
    paddingBottom: 96,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    minHeight: 48,
    gap: 8,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'center',
    flex: 1,
  },
  gridBtn: {
    borderRadius: 10,
    borderWidth: 1,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 38,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    paddingVertical: 0,
  },
  inlineLoadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCluster: {
    marginBottom: 8,
  },
  categoryStrip: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 10,
    gap: 8,
    paddingRight: 18,
  },
  categoryCard: {
    width: 84,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
  },
  categoryThumb: {
    width: 42,
    height: 42,
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImg: {
    width: '100%',
    height: '100%',
  },
  catPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  heroBannerWrap: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  heroBannerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  primaryBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryBannerKicker: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    letterSpacing: 1.8,
    color: '#FEEFE8',
    marginBottom: 1,
  },
  primaryBannerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 19,
    lineHeight: 22,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  primaryBannerSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10.5,
    lineHeight: 14,
    color: '#FFF5F3',
    maxWidth: '66%',
  },
  sectionHeader: {
    paddingHorizontal: 14,
    marginBottom: 7,
    marginTop: 3,
  },
  sectionHeaderRow: {
    paddingHorizontal: 14,
    marginBottom: 7,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    rowGap: 10,
    columnGap: 9,
    marginBottom: 8,
  },
  gridProductCard: {
    width: '48.5%',
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
    paddingBottom: 8,
  },
  gridProductImage: {
    width: '100%',
    height: scale(116),
  },
  productsRail: {
    paddingHorizontal: 14,
    paddingRight: 22,
    paddingBottom: 10,
    gap: 10,
  },
  railProductCard: {
    width: 152,
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
    paddingBottom: 8,
  },
  railProductImage: {
    width: '100%',
    height: 104,
  },
  productMeta: {
    paddingHorizontal: 8,
    paddingTop: 7,
    gap: 3,
  },
  productName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11.5,
    lineHeight: 15,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  productPrice: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  productOldPrice: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 9,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 8,
  },
  deliveryRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 9,
    marginBottom: 11,
  },
  deliveryCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  deliveryImage: {
    width: '100%',
    height: scale(84),
  },
  deliveryMeta: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 2,
  },
  deliveryLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  deliverySub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 9.5,
  },
  productImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: { paddingVertical: 52, alignItems: 'center' },
  errorWrap: { paddingVertical: 34, paddingHorizontal: Spacing.lg, alignItems: 'center', gap: 6 },
  errorText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  errorSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, textAlign: 'center' },
  emptyWrap: { paddingVertical: 32, paddingHorizontal: Spacing.lg, alignItems: 'center', gap: 6 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 12, textAlign: 'center' },
});
