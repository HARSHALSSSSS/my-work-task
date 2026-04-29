import React, { useMemo, useState, useCallback } from 'react';
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
import { dedupeProducts, getProductImageUrl, sortProducts, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { Colors, Radii, Spacing, Typography, scale } from '../../constants/theme';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'BusinessShopByCategory'>;

type DesignProduct = {
  id: string;
  name: string;
  category: string;
  hasPremium: boolean;
  thumbnail?: string;
  price?: number;
  originalPrice?: number;
  discount?: string;
};

type FilterMode = 'all' | 'premium' | 'budget';

const FALLBACK_BANNER = require('../../../assets/images/print-cat-business.png');

export const BusinessShopByCategoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { colors: t } = useThemeStore();
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [products, setProducts] = useState<DesignProduct[]>([]);
  const [filterChips, setFilterChips] = useState(['All', 'Business', 'Marketing', 'Personal']);
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
        productsApi.getBusinessPrintTypes().catch(() => null),
        selectedProductId ? productsApi.getBusinessPrintProduct(selectedProductId).catch(() => null) : Promise.resolve(null),
      ])
        .then(([productsRes, typesRes, selectedProductRes]) => {
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
          const mapped = (items || [])
            .map((p: any) => {
              const { price, originalPrice, discountLabel } = resolveProductPricing(p);
              return {
                id: p._id || p.id,
                name: p.name,
                category: typeof p.category === 'object' ? p.category?.name : p.category || 'Business',
                hasPremium: Boolean(p.isFeatured || p.is_featured || p.designType === 'premium'),
                thumbnail: getProductImageUrl(p),
                price,
                originalPrice,
                discount: discountLabel,
              };
            })
            .filter((p: DesignProduct) => Boolean(p.id));

          const uniqueProducts = dedupeProducts(mapped);
          if (selectedProductId) {
            const selectedOnly = uniqueProducts.filter((p: DesignProduct) => p.id === selectedProductId);
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

          if (typesRes?.length) {
            const uniqueChips = Array.from(new Set(typesRes.map((x: any) => x.name || x).filter(Boolean)));
            setFilterChips(['All', ...uniqueChips]);
          } else {
            setFilterChips(['All', 'Business', 'Marketing', 'Personal']);
          }
        })
        .catch(() => {
          setProducts([]);
          setFilterChips(['All', 'Business', 'Marketing', 'Personal']);
        })
        .finally(() => setLoading(false));
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

  const bannerImage = toAbsoluteAssetUrl(selectedProductImage) || Image.resolveAssetSource(FALLBACK_BANNER).uri;

  const filtered = useMemo(() => {
    let list = products;
    if (activeChip !== 'All') {
      list = list.filter((p) => p.category === activeChip);
    }
    if (filterMode === 'premium') {
      list = list.filter((p) => p.hasPremium || Boolean(p.discount));
    } else if (filterMode === 'budget') {
      list = list.filter((p) => (p.price || 0) <= 200);
    }
    const keyword = query.trim().toLowerCase();
    if (keyword) {
      list = list.filter((p) => p.name.toLowerCase().includes(keyword));
    }
    return list;
  }, [activeChip, filterMode, products, query]);

  const onExplorePremiumPress = useCallback(
    (item: DesignProduct) => {
      navigation.navigate('BusinessPremiumDesigns', {
        productId: item.id,
        image: item.thumbnail,
        name: item.name,
        category: item.category,
        price: item.price,
        originalPrice: item.originalPrice,
        discount: item.discount,
      });
    },
    [navigation],
  );

  const onStartDesignPress = useCallback(
    (item: DesignProduct) => {
      navigation.navigate('PrintCustomize', {
        productId: item.id,
        flowType: 'printing',
        image: item.thumbnail,
        name: item.name,
      });
    },
    [navigation],
  );

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSlot} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Business Printing</Text>
        <View style={styles.headerSlot} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.bannerWrap}>
          <Image source={{ uri: bannerImage }} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerTitle}>{selectedProductName || 'Custom Business Prints'}</Text>
            <Text style={styles.bannerSub}>Choose a design path below</Text>
          </View>
        </View>

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer} contentContainerStyle={styles.chipsRow}>
          {filterChips.map((chip) => {
            const active = activeChip === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[styles.chip, { backgroundColor: active ? t.textPrimary : t.chipBg }]}
                onPress={() => setActiveChip(chip)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, { color: active ? t.background : t.textMuted }]}>{chip}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.filterModeRow}>
          {(['all', 'premium', 'budget'] as FilterMode[]).map((mode) => {
            const active = filterMode === mode;
            const label = mode === 'all' ? 'All products' : mode === 'premium' ? 'Premium' : 'Budget';
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setFilterMode(mode)}
                style={[styles.modeChip, { borderColor: t.border, backgroundColor: active ? t.textPrimary : t.card }]}
              >
                <Text style={[styles.modeChipText, { color: active ? t.background : t.textSecondary }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={t.textPrimary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No product found</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>Try another filter or search keyword.</Text>
          </View>
        ) : (
          <View style={styles.productBlock}>
            {filtered.map((item) => (
              <View key={item.id} style={[styles.productCard, { backgroundColor: t.card, borderColor: t.divider }]}> 
                <View style={[styles.productImageWrap, { backgroundColor: t.chipBg }]}> 
                  {item.thumbnail ? <Image source={{ uri: item.thumbnail }} style={styles.productImage} resizeMode="cover" /> : <FileText size={42} color={t.iconDefault} />}
                </View>

                <View style={styles.productBody}>
                  <Text style={[styles.productName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[styles.productCategory, { color: t.textSecondary }]}>{item.category}</Text>
                  <View style={styles.priceRow}>
                    {item.price ? <Text style={[styles.price, { color: t.textPrimary }]}>₹{item.price}</Text> : null}
                    {item.originalPrice ? <Text style={[styles.priceStrike, { color: t.placeholder }]}>₹{item.originalPrice}</Text> : null}
                    {item.discount ? <Text style={styles.discount}>{item.discount}</Text> : null}
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: t.textPrimary }]} onPress={() => onExplorePremiumPress(item)}>
                    <Text style={[styles.actionText, { color: t.background }]}>Explore Premium</Text>
                    <ArrowRight size={14} color={t.background} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.secondaryAction, { borderColor: t.border }]} onPress={() => onStartDesignPress(item)}>
                    <Text style={[styles.actionText, { color: t.textPrimary }]}>Start design</Text>
                    <ArrowRight size={14} color={t.textPrimary} />
                  </TouchableOpacity>
                </View>
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
    gap: Spacing.xs,
  },
  bannerWrap: {
    borderRadius: Radii.section,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  bannerImage: {
    width: '100%',
    height: scale(134),
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  bannerTitle: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  bannerSub: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.92)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    gap: Spacing.sm,
    borderWidth: 1,
    marginBottom: Spacing.xxs,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  chipsContainer: {
    flexGrow: 0,
    marginBottom: Spacing.xxs,
  },
  chipsRow: {
    gap: 8,
    alignItems: 'center',
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
  },
  chipText: {
    ...Typography.caption,
  },
  filterModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
  },
  modeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeChipText: {
    ...Typography.small,
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
    gap: Spacing.sm,
  },
  productCard: {
    borderWidth: 1,
    borderRadius: Radii.section,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  productImageWrap: {
    width: '100%',
    height: scale(130),
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productBody: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    gap: 2,
  },
  productName: {
    ...Typography.subtitle,
    fontFamily: 'Poppins_600SemiBold',
  },
  productCategory: {
    ...Typography.caption,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  price: {
    ...Typography.bodyBold,
    fontSize: 13,
  },
  priceStrike: {
    ...Typography.small,
    textDecorationLine: 'line-through',
  },
  discount: {
    ...Typography.small,
    color: Colors.green,
    fontFamily: 'Poppins_600SemiBold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  actionBtn: {
    flex: 1,
    borderRadius: Radii.button,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
  },
  secondaryAction: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionText: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
  },
});
