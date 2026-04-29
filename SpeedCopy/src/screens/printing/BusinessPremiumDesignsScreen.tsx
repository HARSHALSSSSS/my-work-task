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
  const productId = route.params?.productId as string;
  const productName = route.params?.name as string | undefined;
  const productImage = route.params?.image as string | undefined;
  const category = route.params?.category as string | undefined;
  const price = route.params?.price as number | undefined;
  const originalPrice = route.params?.originalPrice as number | undefined;
  const discount = route.params?.discount as string | undefined;

  useFocusEffect(useCallback(() => {
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
        const productThumb = toAbsoluteAssetUrl(
          product?.thumbnail || product?.images?.[0] || productImage,
        );
        const fallbackName = product?.name || productName || 'Premium Design';
        const fallbackCategory =
          (typeof product?.category === 'object' ? product?.category?.name : product?.category) ||
          category ||
          'Business';
        const resolvedPricing = product ? resolveProductPricing(product) : { price, originalPrice };
        const mapped = (templates || []).map((tpl: any) => ({
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
  }, [category, discount, originalPrice, price, productId, productImage, productName]));

  const chips = useMemo(() => {
    const unique = Array.from(new Set(items.map((x) => x.category).filter(Boolean)));
    return ['All', ...unique];
  }, [items]);

  const filtered = items.filter((item) => {
    if (selectedChip !== 'All' && item.category !== selectedChip) return false;
    if (!query.trim()) return true;
    return item.name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Shop by category</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchRow, { backgroundColor: t.inputBg, borderColor: t.searchBorder }]}>
        <Search size={18} color={t.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: t.textPrimary }]}
          placeholder="Search"
          placeholderTextColor={t.placeholder}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsContainer}
        contentContainerStyle={styles.chipsRow}
      >
        {chips.map((chip) => {
          const active = chip === selectedChip;
          return (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, { backgroundColor: t.chipBg }, active && [styles.chipActive, { backgroundColor: t.textPrimary }]]}
              onPress={() => setSelectedChip(chip)}
            >
              <Text style={[styles.chipText, { color: t.textMuted }, active && { color: t.background }]}>{chip}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={t.textPrimary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <FileText size={42} color={t.textSecondary} />
          <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No premium design yet</Text>
          <Text style={[styles.emptyCopy, { color: t.textSecondary }]}>
            Premium design templates are not available for this product right now.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
          <View style={styles.gridWrap}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { backgroundColor: t.chipBg, borderColor: t.divider }]}
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
                    });
                  } catch (e: any) {
                    Alert.alert(
                      'Error',
                      e?.serverMessage || e?.message || 'Failed to load template design',
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <View style={[styles.imageWrap, { backgroundColor: t.chipBg }]}>
                  {item.previewImage ? (
                    <Image source={{ uri: item.previewImage }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <FileText size={44} color={t.iconDefault} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
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
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    padding: 0,
  },
  chipsContainer: {
    height: 52,
    flexGrow: 0,
  },
  chipsRow: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
    height: 52,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  chipActive: {
    backgroundColor: '#000000',
  },
  chipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 40,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  emptyCopy: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  imageWrap: {
    width: '100%',
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
