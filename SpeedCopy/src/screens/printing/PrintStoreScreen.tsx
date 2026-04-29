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
import { dedupeProducts, sortProducts, takeUniqueById, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { formatCurrency } from '../../utils/formatCurrency';
import { Colors, Radii, Spacing, Typography, scale } from '../../constants/theme';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'PrintStore'>;

const IMG_BUSINESS_CARDS = require('../../../assets/images/print-business-cards.png');
const IMG_PRINT_BANNER = require('../../../assets/images/print-cat-business.png');
const IMG_PRINT_SECONDARY = require('../../../assets/images/print-cat-flyers.png');

type Category = { id: string; label: string; image?: ImageSourcePropType };

type PrintProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  image: ImageSourcePropType;
  categoryKey?: string;
  isPremium?: boolean;
};

type RecentItem = { id: string; name: string; image: ImageSourcePropType };

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

          setApiCategories([{ id: 'all', label: 'All', image: IMG_PRINT_BANNER }, ...mappedTypes]);

          const homeBannerImages = (home?.banners || [])
            .map((banner: any) => toAbsoluteAssetUrl(banner?.image))
            .filter(Boolean);
          setBannerUris(homeBannerImages.length ? homeBannerImages : [Image.resolveAssetSource(IMG_PRINT_BANNER).uri, Image.resolveAssetSource(IMG_PRINT_SECONDARY).uri]);

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

          const mapped = displaySource
            .map((p: any) => {
              const thumb = p.thumbnail || p.images?.[0];
              const { price, originalPrice, discountLabel } = resolveProductPricing(p);
              const rawCategory =
                p.business_print_type ||
                (typeof p.businessPrintType === 'object'
                  ? p.businessPrintType?.slug || p.businessPrintType?._id || p.businessPrintType?.name
                  : p.businessPrintType) ||
                (typeof p.type === 'object' ? p.type?.slug || p.type?._id || p.type?.name : p.type);
              const isPremium = Boolean(p.isFeatured || p.is_featured || p.premium || p.designType === 'premium');

              return {
                id: p._id || p.id,
                name: p.name,
                price,
                originalPrice,
                discount: discountLabel,
                image: thumb ? { uri: toAbsoluteAssetUrl(thumb) } : IMG_BUSINESS_CARDS,
                categoryKey: String(rawCategory || '').toLowerCase(),
                isPremium,
              };
            })
            .filter((p: PrintProduct) => Boolean(p.id));

          const mappedUnique = dedupeProducts(mapped);
          const usedIds = new Set<string>();
          const uniqueProducts = takeUniqueById(mappedUnique, usedIds, 30);
          const recentPool = mappedUnique.map((m) => ({ id: m.id, name: m.name, image: m.image }));
          const uniqueRecent = takeUniqueById(recentPool, usedIds, 4);

          setApiProducts(uniqueProducts);
          setApiRecent(uniqueRecent);
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
    (item: { id: string; name?: string; price?: number; originalPrice?: number; image?: any; discount?: string }) => {
      if (!item?.id) return;
      navigation.navigate('BusinessShopByCategory', {
        productId: item.id,
        image: resolveImageUri(item.image),
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

        {heroBannerUri ? (
          <View style={styles.bannerWrap}>
            <Image source={{ uri: heroBannerUri }} style={styles.bannerImage} resizeMode="cover" />
          </View>
        ) : null}

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
              <Image source={item.image} style={styles.recentImage} resizeMode="cover" />
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
              <Image source={product.image} style={styles.productImage} resizeMode="cover" />
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    minHeight: 48,
    gap: Spacing.sm,
  },
  headerSlot: {
    width: 36,
    minHeight: 36,
  },
  headerTitle: {
    ...Typography.title,
    flex: 1,
    textAlign: 'center',
  },
  gridBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    minHeight: 42,
    gap: 8,
    marginBottom: Spacing.md,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  bannerWrap: {
    borderRadius: Radii.section,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  bannerImage: {
    width: '100%',
    height: scale(152),
  },
  categoryRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 6,
    width: 78,
    minHeight: 98,
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
    width: '100%',
    height: '100%',
  },
  categoryLabel: {
    ...Typography.small,
    textAlign: 'center',
    lineHeight: 14,
  },
  filterRow: {
    gap: 8,
    marginBottom: Spacing.md,
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
  },
  sectionTitle: {
    ...Typography.subtitle,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: Spacing.sm,
  },
  recentRow: {
    marginBottom: Spacing.md,
  },
  recentCard: {
    width: 86,
    height: 86,
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
    gap: 10,
  },
  productCard: {
    width: '48%',
    borderRadius: Radii.section,
    overflow: 'hidden',
    borderWidth: 1,
    paddingBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  productImage: {
    width: '100%',
    height: scale(135),
    borderTopLeftRadius: Radii.section,
    borderTopRightRadius: Radii.section,
  },
  productInfo: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    gap: 4,
  },
  productName: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  productPrice: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  productOriginal: {
    ...Typography.small,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    ...Typography.small,
    color: Colors.green,
    fontFamily: 'Poppins_600SemiBold',
  },
  loadingWrap: { paddingVertical: 36, alignItems: 'center' },
  emptyWrap: { paddingVertical: 36, alignItems: 'center', gap: 6 },
  emptyTitle: { ...Typography.subtitle, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  emptySub: { ...Typography.caption, textAlign: 'center' },
});
