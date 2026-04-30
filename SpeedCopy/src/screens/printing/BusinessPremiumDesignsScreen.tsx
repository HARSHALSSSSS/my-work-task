import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Search, FileText } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import * as designsApi from '../../api/designs';
import * as productsApi from '../../api/products';
import { toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { Colors, Radii, Spacing, Typography } from '../../constants/theme';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'BusinessPremiumDesigns'>;

type PremiumItem = {
  id: string;
  name: string;
  category: string;
  previewImage?: string;
  productId: string;
  productName?: string;
  productImage?: string;
  price?: number;
  originalPrice?: number;
  discount?: string;
  source: 'template';
};

export const BusinessPremiumDesignsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { colors: t } = useThemeStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PremiumItem[]>([]);
  const [selectedChip, setSelectedChip] = useState('All');
  const [templateFilter, setTemplateFilter] = useState<'all' | 'discounted'>('all');

  const productId = route.params?.productId as string;
  const productName = route.params?.name as string | undefined;
  const productImage = route.params?.image as string | undefined;
  const category = route.params?.category as string | undefined;
  const price = route.params?.price as number | undefined;
  const originalPrice = route.params?.originalPrice as number | undefined;
  const discount = route.params?.discount as string | undefined;

  useFocusEffect(
    useCallback(() => {
      if (!productId) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      Promise.all([
        designsApi.getPremiumTemplates({ productId }).catch(() => []),
        productsApi.getBusinessPrintProduct(productId).catch(() => null),
      ])
        .then(([templates, product]) => {
          const productThumb = toAbsoluteAssetUrl(product?.thumbnail || product?.images?.[0] || productImage);
          const fallbackName = product?.name || productName || 'Premium Design';
          const fallbackCategory =
            (typeof product?.category === 'object' ? product?.category?.name : product?.category) ||
            category ||
            'Business';
          const resolvedPricing = product ? resolveProductPricing(product) : { price, originalPrice };

          const mapped = (templates || [])
            .map((tpl: any) => ({
              id: tpl._id || tpl.id,
              name: tpl.name || fallbackName,
              category: tpl.category || fallbackCategory,
              previewImage: toAbsoluteAssetUrl(tpl.previewImage || tpl.thumbnail || tpl.image || productThumb),
              productId: tpl.productId || productId,
              productName: product?.name || productName,
              productImage: productThumb,
              price: resolvedPricing.price,
              originalPrice: resolvedPricing.originalPrice,
              discount,
              source: 'template' as const,
            }))
            .filter((x) => Boolean(x.id));
          setItems(mapped);
        })
        .finally(() => setLoading(false));
    }, [category, discount, originalPrice, price, productId, productImage, productName]),
  );

  const chips = useMemo(() => {
    const unique = Array.from(new Set(items.map((x) => x.category).filter(Boolean)));
    return ['All', ...unique];
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (selectedChip !== 'All') {
      list = list.filter((item) => item.category === selectedChip);
    }
    if (templateFilter === 'discounted') {
      list = list.filter((item) => Boolean(item.discount));
    }
    const keyword = query.trim().toLowerCase();
    if (keyword) {
      list = list.filter((item) => item.name.toLowerCase().includes(keyword));
    }
    return list;
  }, [items, query, selectedChip, templateFilter]);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Premium Designs</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.searchRow, { backgroundColor: t.inputBg, borderColor: t.searchBorder }]}> 
          <Search size={18} color={t.placeholder} />
          <TextInput
            style={[styles.searchInput, { color: t.textPrimary }]}
            placeholder="Search templates"
            placeholderTextColor={t.placeholder}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer} contentContainerStyle={styles.chipsRow}>
          {chips.map((chip) => {
            const active = chip === selectedChip;
            return (
              <TouchableOpacity
                key={chip}
                style={[styles.chip, { backgroundColor: active ? t.textPrimary : t.chipBg }]}
                onPress={() => setSelectedChip(chip)}
              >
                <Text style={[styles.chipText, { color: active ? t.background : t.textMuted }]}>{chip}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, { borderColor: t.border, backgroundColor: templateFilter === 'all' ? t.textPrimary : t.card }]}
            onPress={() => setTemplateFilter('all')}
          >
            <Text style={[styles.filterChipText, { color: templateFilter === 'all' ? t.background : t.textSecondary }]}>All templates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, { borderColor: t.border, backgroundColor: templateFilter === 'discounted' ? t.textPrimary : t.card }]}
            onPress={() => setTemplateFilter('discounted')}
          >
            <Text style={[styles.filterChipText, { color: templateFilter === 'discounted' ? t.background : t.textSecondary }]}>Discounted</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={t.textPrimary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={42} color={t.textSecondary} />
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No premium design yet</Text>
            <Text style={[styles.emptyCopy, { color: t.textSecondary }]}>Premium design templates are not available for this product right now.</Text>
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: t.card, borderColor: t.divider }]}
                activeOpacity={0.85}
                onPress={async () => {
                  try {
                    setLoading(true);
                    const design = await designsApi.createFromTemplate({
                      productId: item.productId,
                      templateId: item.id,
                      flowType: 'business_printing',
                    });
                    navigation.navigate('PrintCustomize', {
                      productId: item.productId,
                      flowType: 'printing',
                      image: item.productImage || item.previewImage,
                      name: item.productName || item.name,
                      designId: design._id,
                      businessConfigDraft: {
                        designType: 'premium',
                      },
                    });
                  } catch (e: any) {
                    Alert.alert('Error', e?.serverMessage || e?.message || 'Failed to load template design');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <View style={[styles.imageWrap, { backgroundColor: t.chipBg }]}> 
                  {item.previewImage ? <Image source={{ uri: item.previewImage }} style={styles.image} resizeMode="cover" /> : <FileText size={44} color={t.iconDefault} />}
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.templateName, { color: t.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[styles.templateMeta, { color: t.textSecondary }]} numberOfLines={1}>{item.category}</Text>
                  <View style={styles.priceRow}>
                    {item.price ? <Text style={[styles.priceValue, { color: t.textPrimary }]}>₹{item.price}</Text> : null}
                    {item.originalPrice ? <Text style={[styles.priceStrike, { color: t.placeholder }]}>₹{item.originalPrice}</Text> : null}
                    {item.discount ? <Text style={styles.discount}>{item.discount}</Text> : null}
                  </View>
                </View>
              </TouchableOpacity>
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
  },
  headerTitle: {
    ...Typography.title,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    minHeight: 42,
    gap: Spacing.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  chipsContainer: {
    flexGrow: 0,
  },
  chipsRow: {
    gap: 8,
    alignItems: 'center',
    paddingRight: 8,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
  },
  chipText: {
    ...Typography.caption,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterChipText: {
    ...Typography.small,
  },
  loadingWrap: {
    paddingVertical: 34,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 34,
    gap: 9,
  },
  emptyTitle: {
    ...Typography.subtitle,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  emptyCopy: {
    ...Typography.caption,
    textAlign: 'center',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    borderRadius: Radii.section,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  imageWrap: {
    width: '100%',
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  templateName: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
  },
  templateMeta: {
    ...Typography.small,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  priceValue: {
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
});
