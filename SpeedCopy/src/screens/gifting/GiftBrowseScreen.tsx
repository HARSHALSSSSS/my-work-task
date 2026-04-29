import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, ScrollView, StyleSheet, Text, TouchableOpacity, ActivityIndicator, View, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Spacing, Typography } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { ProductCard } from '../../components/ui/ProductCard';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GiftStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import { Product } from '../../types';
import * as productsApi from '../../api/products';
import { dedupeProducts, getProductImageUrl, sortProducts, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { isCatalogProductInStock } from '../../utils/stock';

type Nav = NativeStackNavigationProp<GiftStackParamList, 'GiftStore'>;

export function GiftBrowseScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: t } = useThemeStore();
  const [chip, setChip] = useState('All');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [chips, setChips] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [bannerUri, setBannerUri] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    Promise.all([
      productsApi.getGiftingProducts({ limit: 30 }).catch(() => null),
      productsApi.getGiftingCategories().catch(() => null),
      productsApi.getGiftingHome().catch(() => null),
    ]).then(([productsRes, catsRes, home]) => {
      const rawItems = productsRes?.products || productsRes?.data || (Array.isArray(productsRes) ? productsRes : []);
      const items = sortProducts(dedupeProducts(rawItems));
      const mapped = (items || [])
        .map((p: any) => {
          const pricing = resolveProductPricing(p);
          return {
            id: p._id || p.id,
            name: p.name,
            description: p.description || '',
            ...pricing,
            discountLabel: pricing.discountLabel,
            image: getProductImageUrl(p),
            category: typeof p.category === 'object' ? p.category?.name : (p.category || 'All'),
            inStock: isCatalogProductInStock(p),
          };
        })
        .filter((p: Product) => Boolean(p.id));
      setAllProducts(dedupeProducts(mapped));
      if (catsRes?.length) {
        const uniqueChips = Array.from(new Set(catsRes.map((c: any) => c.name).filter(Boolean)));
        setChips(['All', ...uniqueChips]);
      } else {
        setChips(['All']);
      }
      const bannerPool = home?.banners || [];
      const primaryBanner = bannerPool.find((b: any) => b?.image);
      setBannerUri(primaryBanner?.image ? toAbsoluteAssetUrl(primaryBanner.image) : null);
      setLoading(false);
    }).catch(() => {
      setAllProducts([]);
      setChips(['All']);
      setBannerUri(null);
      setLoading(false);
    });
  }, []));

  const products = useMemo(() => {
    if (chip === 'All') return allProducts;
    return allProducts.filter((p) => p.category === chip);
  }, [chip, allProducts]);

  const onProductPress = useCallback(
    (productId: string) => {
      navigation.navigate('GiftProductDetail', { productId });
    },
    [navigation],
  );

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }) => (
      <ProductCard product={item} onPress={() => onProductPress(item.id)} compact />
    ),
    [onProductPress],
  );

  return (
    <SafeScreen>
      <ScreenHeader title="Gifting" onBack={() => navigation.goBack()} />

      {bannerUri ? (
        <View style={styles.bannerImageWrap}>
          <Image source={{ uri: bannerUri }} style={styles.bannerImage} resizeMode="cover" />
        </View>
      ) : (
        <LinearGradient colors={[Colors.purplePrimary, Colors.purpleBorder]} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.bannerText}>Personalized Gifts</Text>
        </LinearGradient>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        {chips.map((c) => {
          const active = chip === c;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.chip, { backgroundColor: t.surface, borderColor: t.border }, active && styles.chipActive]}
              onPress={() => setChip(c)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, { color: t.textSecondary }, active && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={t.textPrimary} style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 14, color: t.textSecondary }}>No products available</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  chipsScroll: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    paddingRight: Spacing.lg + 4,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.chip,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderGray,
  },
  chipActive: {
    backgroundColor: Colors.purpleLightBg,
    borderColor: Colors.purpleBorder,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    ...Typography.bodyBold,
    color: Colors.purplePrimary,
  },
  banner: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.section,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  bannerText: {
    ...Typography.h3,
    color: Colors.surface,
  },
  bannerImageWrap: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.section,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  bannerImage: {
    width: '100%',
    height: 156,
  },
  list: { flex: 1 },
  columnWrap: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    paddingTop: Spacing.sm,
  },
});
