import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Search, ArrowRight, Gift } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Spacing } from '../../constants/theme';
import { GiftStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { dedupeProducts, getProductImageUrl, sortProducts } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';

type Nav = NativeStackNavigationProp<GiftStackParamList, 'GiftShopByCategory'>;

type DesignItem = {
  id: string;
  name: string;
  category: string;
  isPremium: boolean;
  thumbnail?: string;
  price?: number;
  originalPrice?: number;
  discount?: string;
};

export function GiftShopByCategoryScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: t } = useThemeStore();
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [designItems, setDesignItems] = useState<DesignItem[]>([]);
  const [filterChips, setFilterChips] = useState(['All', 'Birthday', 'Love', 'Anniversary']);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([
      productsApi.getGiftingProducts({ limit: 40 }).catch(() => null),
      productsApi.getGiftingCategories().catch(() => null),
    ]).then(([productsRes, catsRes]) => {
      const rawItems = productsRes?.products || productsRes?.data || (Array.isArray(productsRes) ? productsRes : []);
      const items = sortProducts(dedupeProducts(rawItems));
      const mapped = (items || [])
        .map((p: any) => {
          const { price, originalPrice, discountLabel } = resolveProductPricing(p);
          return {
            id: p._id || p.id,
            name: p.name || 'Product',
            category: typeof p.category === 'object' ? p.category?.name : (p.category || 'All'),
            isPremium: p.isFeatured || false,
            thumbnail: getProductImageUrl(p),
            price,
            originalPrice,
            discount: discountLabel,
          };
        })
        .filter((p: DesignItem) => Boolean(p.id));
      setDesignItems(dedupeProducts(mapped));
      if (catsRes?.length) {
        const uniqueChips = Array.from(new Set(catsRes.map((c: any) => c.name).filter(Boolean)));
        setFilterChips(['All', ...uniqueChips]);
      } else {
        setFilterChips(['All', 'Birthday', 'Love', 'Anniversary']);
      }
      setLoading(false);
    }).catch(() => {
      setDesignItems([]);
      setFilterChips(['All', 'Birthday', 'Love', 'Anniversary']);
      setLoading(false);
    });
  }, []));

  const filtered = (activeChip === 'All'
    ? designItems
    : designItems.filter((d) => d.category === activeChip)
  ).filter((d) => !search.trim() || d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSlot} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Shop by category</Text>
        <View style={styles.headerSlot} />
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { borderBottomColor: t.searchBorder }]}>
        <Search size={18} color={t.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: t.textPrimary }]}
          placeholder="Search"
          placeholderTextColor={t.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipContainer}
        contentContainerStyle={styles.chipRow}
      >
        {filterChips.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[
              styles.chip,
              { backgroundColor: activeChip === chip ? t.textPrimary : t.chipBg },
            ]}
            onPress={() => setActiveChip(chip)}
          >
            <Text style={[
              styles.chipText,
              { color: activeChip === chip ? t.surface : t.textMuted },
            ]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Design Grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={t.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={{ flex: 1 }}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.designCard, { backgroundColor: t.card }]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('GiftProductDetail', {
                  productId: item.id,
                  image: item.thumbnail,
                  name: item.name,
                  price: item.price,
                  originalPrice: item.originalPrice,
                  discount: item.discount,
                })
              }
            >
              <View style={[styles.designImgPlaceholder, { backgroundColor: t.chipBg }]}>
                {item.thumbnail ? (
                  <Image source={{ uri: item.thumbnail }} style={styles.designImg} resizeMode="cover" />
                ) : (
                  <Gift size={48} color={t.placeholder} />
                )}
              </View>
              <TouchableOpacity style={[styles.startDesignBtn, { backgroundColor: t.textPrimary }]} activeOpacity={0.9}>
                <Text style={[styles.startDesignText, { color: t.background }]} numberOfLines={1}>
                  {item.isPremium ? 'Explore Premium designs' : 'Start design'}
                </Text>
                <ArrowRight size={14} color={t.background} style={{ flexShrink: 0 }} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
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
    color: '#242424',
    flex: 1,
    textAlign: 'center',
    lineHeight: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 2,
    height: 44,
    gap: 10,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#242424',
    paddingVertical: 0,
  },
  chipContainer: {
    height: 52,
    flexGrow: 0,
  },
  chipRow: {
    paddingHorizontal: Spacing.lg,
    paddingRight: Spacing.xl,
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
  grid: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    paddingTop: Spacing.sm,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  designCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
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
  designImg: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  designImgPlaceholder: {
    width: '100%',
    height: 170,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  startDesignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 6,
  },
  startDesignText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10.5,
    color: '#FFFFFF',
    flexShrink: 1,
  },
});

