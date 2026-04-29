import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Image, ImageSourcePropType, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, LayoutGrid } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { scale } from '../../constants/theme';
import { PrintStackParamList } from '../../navigation/types';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { dedupeProducts, sortProducts, takeUniqueById, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { formatCurrency } from '../../utils/formatCurrency';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'PrintStore'>;

const IMG_BUSINESS_CARDS = require('../../../assets/images/print-business-cards.png');

type Category = { id: string; label: string; image?: ImageSourcePropType };
type PrintProduct = {
  id: string; name: string; price: number; originalPrice?: number;
  discount?: string; image: ImageSourcePropType; categoryKey?: string;
};
type RecentItem = { id: string; name: string; image: ImageSourcePropType };

export const PrintStoreScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [activeCategory, setActiveCategory] = useState('all');
  const { colors: t } = useThemeStore();
  const setMode = useCategoryStore((s) => s.setMode);
  const [apiCategories, setApiCategories] = useState<Category[]>([]);
  const [apiProducts, setApiProducts] = useState<PrintProduct[]>([]);
  const [apiRecent, setApiRecent] = useState<RecentItem[]>([]);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  React.useEffect(() => {
    setMode('printing');
  }, [setMode]);

  useFocusEffect(useCallback(() => {
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
            image: x.image ? ({ uri: toAbsoluteAssetUrl(x.image) } as ImageSourcePropType) : undefined,
          }))
          .filter((x: Category) => {
            const key = String(x.id || '');
            if (!key || categorySeen.has(key)) return false;
            categorySeen.add(key);
            return true;
          });
        setApiCategories(mappedTypes.length ? [{ id: 'all', label: 'All' }, ...mappedTypes] : []);

        setBannerUri(null);

        const listItemsRaw: any[] = productRes?.products || productRes?.data || (Array.isArray(productRes) ? productRes : []);
        const businessItems = sortProducts(dedupeProducts(listItemsRaw));
        const genericResAny = genericPrintRes as any;
        const genericRaw: any[] =
          genericResAny?.products || genericResAny?.data?.products || genericResAny?.data || (Array.isArray(genericResAny) ? genericResAny : []);
        const genericItems = sortProducts(
          dedupeProducts(genericRaw).filter((p: any) => String(p?.flowType || '').toLowerCase() === 'printing'),
        );
        const featuredHome = sortProducts(dedupeProducts(home?.featured_products || []));
        const displaySource = sortProducts(
          dedupeProducts(businessItems.length > 0 ? [...featuredHome, ...businessItems] : [...featuredHome, ...genericItems]),
        );

        if (displaySource.length) {
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
            return {
              id: p._id || p.id,
              name: p.name,
              price,
              originalPrice,
              discount: discountLabel,
              image: thumb ? { uri: toAbsoluteAssetUrl(thumb) } : IMG_BUSINESS_CARDS,
              categoryKey: String(rawCategory || '').toLowerCase(),
            };
          })
            .filter((p: PrintProduct) => Boolean(p.id));
          const mappedUnique = dedupeProducts(mapped);

          const usedIds = new Set<string>();
          // Keep products as the primary section so newly added items are always visible.
          const uniqueProducts = takeUniqueById(mappedUnique, usedIds, 20);
          const recentPool = mappedUnique.map((m) => ({ id: m.id, name: m.name, image: m.image }));
          const uniqueRecent = takeUniqueById(recentPool, usedIds, 4);

          setApiProducts(uniqueProducts);
          setApiRecent(uniqueRecent);
        } else {
          setApiProducts([]);
          setApiRecent([]);
        }
      })
      .catch((e) => { setLoadError(e?.message || 'Could not load print store.'); })
      .finally(() => setLoading(false));
  }, []));

  const displayCategories = apiCategories;
  const displayProducts = activeCategory === 'all'
    ? apiProducts
    : apiProducts.filter((p) => p.categoryKey === activeCategory);
  const displayRecent = apiRecent;
  const hasAnyProducts = displayRecent.length > 0 || displayProducts.length > 0;

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

  const onRecentPress = useCallback(
    (item: RecentItem) => {
      navigation.navigate('BusinessShopByCategory', {
        productId: item.id,
        image: resolveImageUri(item.image),
        name: item.name,
      });
    },
    [navigation],
  );

  const onSearchPress = useCallback(() => {
    navigation.navigate('BusinessShopByCategory', {});
  }, [navigation]);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <View style={styles.headerSlot} />
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Print Store</Text>
        <TouchableOpacity style={[styles.gridBtn, { borderColor: t.border }]} activeOpacity={0.7}>
          <LayoutGrid size={20} color={t.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        nestedScrollEnabled
      >
        {/* Search */}
        <View style={styles.searchRow}>
          <TouchableOpacity style={[styles.searchBarTouchable, { borderBottomColor: t.searchBorder }]} activeOpacity={0.7} onPress={onSearchPress}>
            <Search size={18} color={t.placeholder} />
            <Text style={[styles.searchPlaceholder, { color: t.placeholder }]}>Search</Text>
          </TouchableOpacity>
        </View>

        {bannerUri ? (
          <View style={styles.bannerWrap}>
            <Image source={{ uri: bannerUri }} style={styles.bannerImage} resizeMode="cover" />
          </View>
        ) : null}

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={t.textPrimary} />
          </View>
        )}

        {!loading && loadError && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>Couldn't load the print store</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>{loadError}</Text>
          </View>
        )}

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          nestedScrollEnabled
        >
          {displayCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryItem}
              onPress={() => setActiveCategory(cat.id)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.categoryCircle,
                { backgroundColor: t.card, borderColor: t.border },
                activeCategory === cat.id && [styles.categoryCircleActive, { borderColor: t.textPrimary }],
              ]}>
                {cat.image ? (
                  <Image source={cat.image} style={styles.categoryImage} resizeMode="cover" />
                ) : (
                  <LayoutGrid size={20} color={t.textPrimary} />
                )}
              </View>
              <Text style={[styles.categoryLabel, { color: t.textMuted }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recently Viewed */}
        {displayRecent.length > 0 && <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Recently Viewed</Text>}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentRow} nestedScrollEnabled>
          {displayRecent.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.recentCard, { backgroundColor: t.card, borderColor: t.divider }]}
              onPress={() => onRecentPress(item)}
              activeOpacity={0.85}
            >
              <Image source={item.image} style={styles.recentImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* New Arrivals */}
        {displayProducts.length > 0 && <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>New Arrivals</Text>}
        {!loading && !loadError && !hasAnyProducts && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No print products yet</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>Check back soon.</Text>
          </View>
        )}
        <View style={styles.productsGrid}>
          {displayProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[styles.productCard, { backgroundColor: t.card }]}
              onPress={() =>
                onProductPress({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  originalPrice: product.originalPrice,
                  image: product.image,
                  discount: product.discount,
                })
              }
              activeOpacity={0.85}
            >
              <Image source={product.image} style={styles.productImage} resizeMode="cover" />
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: t.textPrimary }]} numberOfLines={2}>{product.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.productPrice, { color: t.textPrimary }]}>{formatCurrency(product.price)}</Text>
                  {product.originalPrice && (
                    <Text style={[styles.productOriginal, { color: t.placeholder }]}>MRP {formatCurrency(product.originalPrice)}</Text>
                  )}
                  {product.discount && (
                    <View style={[styles.discountBadge, { backgroundColor: t.badgeBg }]}>
                      <Text style={styles.discountText}>{product.discount}</Text>
                    </View>
                  )}
                </View>
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
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    minHeight: 52,
    gap: 12,
  },
  headerSlot: {
    width: 40,
    minHeight: 40,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  gridBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchBarTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 2,
    height: 44,
    gap: 10,
  },
  searchPlaceholder: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#A5A5A5',
  },
  bannerWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  bannerImage: {
    width: '100%',
    height: scale(175),
    borderRadius: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 4,
    marginBottom: 24,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 8,
    width: 85,
    minHeight: 106,
  },
  categoryCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  categoryCircleActive: {
    borderColor: '#000',
    borderWidth: 1.5,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  categoryLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#424242',
    textAlign: 'center',
    lineHeight: 15,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: '#000',
    marginBottom: 12,
  },
  recentRow: {
    marginBottom: 24,
    paddingRight: 4,
  },
  recentCard: {
    width: 100,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E8EAF0',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  recentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 8,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EAF0',
    paddingBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  productImage: {
    width: '100%',
    height: scale(160),
    backgroundColor: '#F6F6F6',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  productInfo: {
    paddingHorizontal: 11,
    paddingTop: 10,
    gap: 4,
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12.5,
    color: '#000',
    lineHeight: 17,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 1,
  },
  productPrice: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#000',
  },
  productOriginal: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10.5,
    color: '#A5A5A5',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#E8F8EE',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  discountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9.5,
    color: '#00A63E',
  },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyWrap: { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#000' },
  emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#6B6B6B', textAlign: 'center' },
});

