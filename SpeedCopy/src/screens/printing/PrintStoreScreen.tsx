import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, LayoutGrid } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { dedupeProducts, getProductImageUrl, mergeProductImageCandidates, sortProducts, takeUniqueById, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { formatCurrency } from '../../utils/formatCurrency';
import { Colors, Radii, Spacing, Typography, scale } from '../../constants/theme';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'PrintStore'>;

const IMG_BUSINESS_CARDS = require('../../../assets/images/print-business-cards.png');
const IMG_PRINT_BANNER = require('../../../assets/images/print-cat-business.png');
const IMG_PRINT_SECONDARY = require('../../../assets/images/print-cat-flyers.png');
const IMG_PRINT_BANNER_FALLBACK = require('../../../assets/images/print-business-cards.png');

type Category = { id: string; label: string; image?: ImageSourcePropType };

type PrintProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  image: ImageSourcePropType;
  imageCandidates?: string[];
  categoryKey?: string;
  isPremium?: boolean;
};

type RecentItem = { id: string; name: string; image: ImageSourcePropType; imageCandidates?: string[] };

type FilterKey = 'all' | 'popular' | 'premium' | 'budget';

const FILTERS: Array<{ id: FilterKey; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'popular', label: 'Popular' },
  { id: 'premium', label: 'Premium' },
  { id: 'budget', label: 'Budget' },
];

function resolveCategoryFallbackImage(label: string): ImageSourcePropType {
  const key = String(label || '').toLowerCase();
  if (key.includes('flyer') || key.includes('brochure')) return IMG_PRINT_SECONDARY;
  return IMG_PRINT_BANNER;
}

function PrintStoreProductImage({
  image,
  imageCandidates,
  style,
  placeholderColor,
  iconColor,
}: {
  image: ImageSourcePropType;
  imageCandidates?: string[];
  style: any;
  placeholderColor: string;
  iconColor: string;
}) {
  const candidates = React.useMemo(() => {
    if (imageCandidates?.length) return imageCandidates;
    if (typeof image === 'object' && image && 'uri' in (image as any)) {
      const uri = toAbsoluteAssetUrl(String((image as any).uri || ''));
      return uri ? [uri] : [];
    }
    return [];
  }, [image, imageCandidates]);
  const [imageIndex, setImageIndex] = React.useState(0);

  React.useEffect(() => {
    setImageIndex(0);
  }, [image, imageCandidates]);

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

  if (typeof image === 'number') {
    return <Image source={image} style={style} resizeMode="cover" />;
  }

  return (
    <View style={[style, styles.productImageFallback, { backgroundColor: placeholderColor }]}> 
      <LayoutGrid size={22} color={iconColor} />
    </View>
  );
}

export const PrintStoreScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { colors: t } = useThemeStore();
  const setMode = useCategoryStore((s) => s.setMode);
  const [apiCategories, setApiCategories] = useState<Category[]>([]);
  const [apiProducts, setApiProducts] = useState<PrintProduct[]>([]);
  const [apiRecent, setApiRecent] = useState<RecentItem[]>([]);
  const [bannerUris, setBannerUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  React.useEffect(() => {
    setMode('printing');
  }, [setMode]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setLoadError(null);
      Promise.all([
        productsApi.getBusinessPrintingHome().catch(() => null),
        productsApi.getBusinessPrintTypes().catch(() => []),
        productsApi.getBusinessPrintProducts({ limit: 40 }).catch(() => null),
        productsApi.getProducts({ flowType: 'printing', limit: 40 }).catch(() => null),
      ])
        .then(([home, printTypes, productRes, genericPrintRes]) => {
          const categorySeen = new Set<string>();
          const mappedTypes = (printTypes || [])
            .map((x: any) => ({
              id: String(x.slug || x._id || x.id || x.name || '').toLowerCase(),
              label: x.name || x.label || 'Type',
              image: x.image
                ? ({ uri: toAbsoluteAssetUrl(x.image) } as ImageSourcePropType)
                : resolveCategoryFallbackImage(x.name || x.label || ''),
            }))
            .filter((x: Category) => {
              const key = String(x.id || '');
              if (!key || categorySeen.has(key)) return false;
              categorySeen.add(key);
              return true;
            });

          setApiCategories([{ id: 'all', label: 'All' }, ...mappedTypes]);

          const homeBannerImages = (home?.banners || [])
            .map((banner: any) => toAbsoluteAssetUrl(banner?.image))
            .filter(Boolean);
          setBannerUris(homeBannerImages.length ? homeBannerImages : [Image.resolveAssetSource(IMG_PRINT_BANNER_FALLBACK).uri]);

          const listItemsRaw: any[] = productRes?.products || productRes?.data || (Array.isArray(productRes) ? productRes : []);
          const businessItems = sortProducts(dedupeProducts(listItemsRaw));

          const genericResAny = genericPrintRes as any;
          const genericRaw: any[] =
            genericResAny?.products ||
            genericResAny?.data?.products ||
            genericResAny?.data ||
            (Array.isArray(genericResAny) ? genericResAny : []);
          const genericItems = sortProducts(
            dedupeProducts(genericRaw).filter((p: any) => String(p?.flowType || '').toLowerCase() === 'printing'),
          );

          const featuredHome = sortProducts(dedupeProducts(home?.featured_products || []));
          const displaySource = sortProducts(
            dedupeProducts(businessItems.length > 0 ? [...featuredHome, ...businessItems] : [...featuredHome, ...genericItems]),
          );

          return Promise.all(displaySource.map(async (p: any) => {
            const productId = String(p?._id || p?.id || '').trim();
            const detailProduct = productId ? await productsApi.getBusinessPrintProduct(productId).catch(() => null) : null;
            const source = detailProduct || p;
            const imageCandidates = mergeProductImageCandidates(source, p);
            const { price, originalPrice, discountLabel } = resolveProductPricing(source);
            const rawCategory =
              source.business_print_type ||
              (typeof source.businessPrintType === 'object'
                ? source.businessPrintType?.slug || source.businessPrintType?._id || source.businessPrintType?.name
                : source.businessPrintType) ||
              (typeof source.type === 'object' ? source.type?.slug || source.type?._id || source.type?.name : source.type);
            const isPremium = Boolean(source.isFeatured || source.is_featured || source.premium || source.designType === 'premium');

            return {
              id: source._id || source.id || p._id || p.id,
              name: source.name || p.name,
              price,
              originalPrice,
              discount: discountLabel,
              image: imageCandidates[0] ? ({ uri: imageCandidates[0] } as ImageSourcePropType) : IMG_BUSINESS_CARDS,
              imageCandidates,
              categoryKey: String(rawCategory || '').toLowerCase(),
              isPremium,
            } satisfies PrintProduct;
          })).then((mappedItems) => {
            const mappedUnique = dedupeProducts(mappedItems.filter((item) => Boolean(item.id)));
            const usedIds = new Set<string>();
            const uniqueProducts = takeUniqueById(mappedUnique, usedIds, 30);
            const recentPool = mappedUnique.map((m) => ({ id: m.id, name: m.name, image: m.image, imageCandidates: m.imageCandidates }));
            const uniqueRecent = takeUniqueById(recentPool, usedIds, 4);

            setApiProducts(uniqueProducts);
            setApiRecent(uniqueRecent);
          });
        })
        .catch((e) => {
          setLoadError(e?.message || 'Could not load print store.');
        })
        .finally(() => setLoading(false));
    }, []),
  );

  const resolveImageUri = (img: any): string | undefined => {
    if (!img) return undefined;
    if (typeof img === 'object' && 'uri' in img) return toAbsoluteAssetUrl(img.uri);
    if (typeof img === 'number') return Image.resolveAssetSource(img)?.uri;
    if (typeof img === 'string') return toAbsoluteAssetUrl(img);
    return undefined;
  };

  const onProductPress = useCallback(
    (item: { id: string; name?: string; price?: number; originalPrice?: number; image?: any; imageCandidates?: string[]; discount?: string }) => {
      if (!item?.id) return;
      navigation.navigate('BusinessShopByCategory', {
        productId: item.id,
        image: item.imageCandidates?.[0] || resolveImageUri(item.image),
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        discount: item.discount,
      });
    },
    [navigation],
  );

  const displayProducts = useMemo(() => {
    const lowerQuery = searchQuery.trim().toLowerCase();
    let list = activeCategory === 'all' ? apiProducts : apiProducts.filter((p) => p.categoryKey === activeCategory);

    if (activeFilter === 'premium') {
      list = list.filter((p) => p.isPremium || Boolean(p.discount));
    } else if (activeFilter === 'budget') {
      list = list.filter((p) => p.price <= 200);
    } else if (activeFilter === 'popular') {
      list = list.filter((p) => Boolean(p.discount) || Boolean(p.isPremium));
    }

    if (lowerQuery) {
      list = list.filter((p) => p.name.toLowerCase().includes(lowerQuery));
    }

    return list;
  }, [activeCategory, activeFilter, apiProducts, searchQuery]);

  const displayRecent = useMemo(() => {
    if (!searchQuery.trim()) return apiRecent;
    return apiRecent.filter((item) => item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  }, [apiRecent, searchQuery]);

  const hasAnyProducts = displayRecent.length > 0 || displayProducts.length > 0;
  const heroBannerUri = bannerUris[0];

  return (
    <SafeScreen>
      <View style={styles.header}>
        <View style={styles.headerSlot} />
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Print Store</Text>
        <TouchableOpacity style={[styles.gridBtn, { borderColor: t.border }]} activeOpacity={0.7}>
          <LayoutGrid size={19} color={t.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        nestedScrollEnabled
      >
        <View style={[styles.searchBar, { backgroundColor: t.card, borderColor: t.border }]}> 
          <Search size={16} color={t.placeholder} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search business printing"
            placeholderTextColor={t.placeholder}
            style={[styles.searchInput, { color: t.textPrimary }]}
          />
        </View>

        <View style={[styles.bannerWrap, { backgroundColor: t.card, borderColor: t.border }]}>
          <Image
            source={{ uri: heroBannerUri || Image.resolveAssetSource(IMG_PRINT_BANNER_FALLBACK).uri }}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={t.textPrimary} />
          </View>
        ) : null}

        {!loading && loadError ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>Couldn't load the print store</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>{loadError}</Text>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow} nestedScrollEnabled>
          {apiCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryItem}
              onPress={() => setActiveCategory(cat.id)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.categoryCircle,
                  { backgroundColor: t.card, borderColor: activeCategory === cat.id ? t.textPrimary : t.border },
                ]}
              >
                {cat.image ? <Image source={cat.image} style={styles.categoryImage} resizeMode="cover" /> : <LayoutGrid size={18} color={t.iconDefault} />}
              </View>
              <Text style={[styles.categoryLabel, { color: t.textMuted }]} numberOfLines={2}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} nestedScrollEnabled>
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, { borderColor: t.border, backgroundColor: active ? t.textPrimary : t.card }]}
                onPress={() => setActiveFilter(filter.id)}
              >
                <Text style={[styles.filterText, { color: active ? t.background : t.textSecondary }]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {displayRecent.length > 0 ? <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Recently viewed</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentRow} nestedScrollEnabled>
          {displayRecent.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.recentCard, { backgroundColor: t.card, borderColor: t.divider }]}
              onPress={() => onProductPress(item)}
              activeOpacity={0.85}
            >
              <PrintStoreProductImage
                image={item.image}
                imageCandidates={item.imageCandidates}
                style={styles.recentImage}
                placeholderColor={t.chipBg}
                iconColor={t.placeholder}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {displayProducts.length > 0 ? <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Business printing products</Text> : null}
        {!loading && !loadError && !hasAnyProducts ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No print products yet</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>Try another filter or check again soon.</Text>
          </View>
        ) : null}

        <View style={styles.productsGrid}>
          {displayProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[styles.productCard, { backgroundColor: t.card, borderColor: t.divider }]}
              onPress={() => onProductPress(product)}
              activeOpacity={0.85}
            >
              <PrintStoreProductImage
                image={product.image}
                imageCandidates={product.imageCandidates}
                style={styles.productImage}
                placeholderColor={t.chipBg}
                iconColor={t.placeholder}
              />
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: t.textPrimary }]} numberOfLines={2}>
                  {product.name}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.productPrice, { color: t.textPrimary }]}>{formatCurrency(product.price)}</Text>
                  {product.originalPrice ? (
                    <Text style={[styles.productOriginal, { color: t.placeholder }]}>MRP {formatCurrency(product.originalPrice)}</Text>
                  ) : null}
                </View>
                {product.discount ? (
                  <View style={[styles.discountBadge, { backgroundColor: t.badgeBg }]}> 
                    <Text style={styles.discountText}>{product.discount}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    minHeight: 52,
    gap: 10,
  },
  headerSlot: {
    width: 36,
    minHeight: 36,
  },
  headerTitle: {
    ...Typography.title,
    fontSize: 18.5,
    lineHeight: 24,
    flex: 1,
    textAlign: 'center',
  },
  gridBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    ...Typography.body,
    fontSize: 15,
    flex: 1,
    paddingVertical: 0,
  },
  bannerWrap: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bannerImage: {
    width: '100%',
    height: scale(124),
  },
  categoryRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
    marginBottom: 14,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 6,
    width: 82,
    minHeight: 100,
  },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryImage: {
    width: '92%',
    height: '92%',
    borderRadius: 28,
  },
  categoryLabel: {
    ...Typography.small,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  filterRow: {
    gap: 8,
    marginBottom: 14,
    paddingRight: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterText: {
    ...Typography.caption,
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  recentRow: {
    marginBottom: 14,
  },
  recentCard: {
    width: 80,
    height: 80,
    borderRadius: Radii.section,
    marginRight: 10,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 7 },
      android: { elevation: 2 },
    }),
  },
  recentImage: {
    width: '100%',
    height: '100%',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    columnGap: 10,
  },
  productCard: {
    width: '48%',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    paddingBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  productImage: {
    width: '100%',
    height: scale(126),
  },
  productImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 5,
  },
  productName: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11.5,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  productPrice: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
  },
  productOriginal: {
    ...Typography.small,
    fontSize: 9.5,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    ...Typography.small,
    fontSize: 8.5,
    color: Colors.green,
    fontFamily: 'Poppins_600SemiBold',
  },
  loadingWrap: { paddingVertical: 36, alignItems: 'center' },
  emptyWrap: { paddingVertical: 36, alignItems: 'center', gap: 6 },
  emptyTitle: { ...Typography.subtitle, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  emptySub: { ...Typography.caption, textAlign: 'center' },
});
