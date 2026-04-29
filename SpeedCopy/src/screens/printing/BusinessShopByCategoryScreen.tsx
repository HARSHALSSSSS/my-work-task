import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Search, ArrowRight, FileText } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { dedupeProducts, getProductImageUrl, sortProducts } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';

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

export const BusinessShopByCategoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { colors: t } = useThemeStore();
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [products, setProducts] = useState<DesignProduct[]>([]);
  const [filterChips, setFilterChips] = useState(['All', 'Business', 'Marketing', 'Personal']);
  const [loading, setLoading] = useState(true);
  const selectedProductId = route.params?.productId as string | undefined;
  const selectedProductName = route.params?.name as string | undefined;
  const selectedProductImage = route.params?.image as string | undefined;
  const selectedProductPrice = route.params?.price as number | undefined;
  const selectedProductOriginalPrice = route.params?.originalPrice as number | undefined;
  const selectedProductDiscount = route.params?.discount as string | undefined;

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([
      productsApi.getBusinessPrintProducts({ limit: 20 }).catch(() => null),
      productsApi.getBusinessPrintTypes().catch(() => null),
      selectedProductId ? productsApi.getBusinessPrintProduct(selectedProductId).catch(() => null) : Promise.resolve(null),
    ]).then(([productsRes, typesRes, selectedProductRes]) => {
      const rawItems = productsRes?.products || productsRes?.data || (Array.isArray(productsRes) ? productsRes : []);
      const selectedItems = selectedProductRes ? [selectedProductRes] : [];
      const routeFallbackItems = selectedProductId ? [{
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
      }] : [];
      const items = sortProducts(dedupeProducts([...selectedItems, ...routeFallbackItems, ...rawItems]));
      const mapped = (items || [])
        .map((p: any) => {
          const { price, originalPrice, discountLabel } = resolveProductPricing(p);
          return {
            id: p._id || p.id,
            name: p.name,
            category: typeof p.category === 'object' ? p.category?.name : (p.category || 'Business'),
            hasPremium: p.isFeatured || p.is_featured || false,
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
        if (selectedOnly.length) {
          setProducts(selectedOnly);
        } else if (selectedProductName || selectedProductImage) {
          setProducts([{
            id: selectedProductId,
            name: selectedProductName || 'Business Product',
            category: route.params?.category || 'Business',
            hasPremium: false,
            thumbnail: selectedProductImage,
            price: selectedProductPrice,
            originalPrice: selectedProductOriginalPrice,
            discount: selectedProductDiscount,
          }]);
        } else {
          setProducts([]);
        }
      } else {
        setProducts(uniqueProducts);
      }
      if (typesRes?.length) {
        const uniqueChips = Array.from(new Set(typesRes.map((t: any) => t.name || t).filter(Boolean)));
        setFilterChips(['All', ...uniqueChips]);
      } else {
        setFilterChips(['All', 'Business', 'Marketing', 'Personal']);
      }
      setLoading(false);
    }).catch(() => {
      setProducts([]);
      setFilterChips(['All', 'Business', 'Marketing', 'Personal']);
      setLoading(false);
    });
  }, [route.params?.category, selectedProductDiscount, selectedProductId, selectedProductImage, selectedProductName, selectedProductOriginalPrice, selectedProductPrice]));

  const filtered = products.filter((p) => {
    if (activeChip !== 'All' && p.category !== activeChip) return false;
    if (query.trim()) {
      return p.name.toLowerCase().includes(query.toLowerCase());
    }
    return true;
  });

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
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Shop by category</Text>
        <View style={styles.headerSlot} />
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsContainer}
        contentContainerStyle={styles.chipsRow}
      >
        {filterChips.map((chip) => {
          const active = activeChip === chip;
          return (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, { backgroundColor: t.chipBg }, active && [styles.chipActive, { backgroundColor: t.textPrimary }]]}
              onPress={() => setActiveChip(chip)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, { color: t.textMuted }, active && [styles.chipTextActive, { color: t.background }]]}>{chip}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={t.textPrimary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No product found</Text>
          <Text style={[styles.emptySub, { color: t.textSecondary }]}>
            The selected print product could not be loaded here yet.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          {filtered.map((item) => (
            <View key={item.id} style={styles.productBlock}>
              <View style={styles.gridRow}>
                <ProductDesignCard
                  product={item}
                  buttonLabel="Explore Premium designs"
                  onPress={() => onExplorePremiumPress(item)}
                />
                <ProductDesignCard
                  product={item}
                  buttonLabel="Start design"
                  onPress={() => onStartDesignPress(item)}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeScreen>
  );
};

function ProductDesignCard({
  product,
  buttonLabel,
  onPress,
}: {
  product: DesignProduct;
  buttonLabel: string;
  onPress: () => void;
}) {
  const { colors: t } = useThemeStore();
  return (
    <TouchableOpacity style={[styles.designCard, { backgroundColor: t.chipBg, borderColor: t.divider }]} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.designImage, { backgroundColor: t.chipBg }]}>
        {product.thumbnail ? (
          <Image source={{ uri: product.thumbnail }} style={styles.designImgFull} resizeMode="cover" />
        ) : (
          <FileText size={40} color={t.iconDefault} />
        )}
      </View>
      <View style={[styles.designBtn, { backgroundColor: t.textPrimary }]}>
        <Text style={[styles.designBtnText, { color: t.background }]} numberOfLines={1}>
          {buttonLabel}
        </Text>
        <ArrowRight size={14} color={t.background} style={{ flexShrink: 0 }} />
      </View>
    </TouchableOpacity>
  );
}

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
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: '#000',
    textAlign: 'center',
    flex: 1,
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
    color: '#000',
    padding: 0,
  },
  chipsContainer: {
    height: 52,
    flexGrow: 0,
  },
  chipsRow: {
    paddingHorizontal: 16,
    paddingRight: 24,
    gap: 10,
    alignItems: 'center',
    height: 52,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
  },
  chipActive: {
    backgroundColor: '#000000',
  },
  chipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 18,
    paddingTop: 8,
  },
  productBlock: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  designCard: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EAF0',
    minHeight: 224,
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  designImage: {
    width: '100%',
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  designImgFull: {
    width: '100%',
    height: '100%',
  },
  designBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 6,
  },
  designBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10.5,
    color: '#FFFFFF',
    flexShrink: 1,
  },
});

