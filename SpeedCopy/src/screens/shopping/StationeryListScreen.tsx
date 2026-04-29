import React, { useCallback, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet, TouchableOpacity, ActivityIndicator, View, Text } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SlidersHorizontal } from 'lucide-react-native';
import { Colors, Spacing } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { ProductCard } from '../../components/ui/ProductCard';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { HomeStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Product } from '../../types';
import * as productsApi from '../../api/products';
import { dedupeProducts, getProductImageUrl, sortProducts } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { isCatalogProductInStock } from '../../utils/stock';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'StationeryList'>;
type Route = RouteProp<HomeStackParamList, 'StationeryList'>;

export function StationeryListScreen() {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const category = route.params?.category;

  const toggleWishlist = useOrderStore((s) => s.toggleWishlist);
  const isWishlisted = useOrderStore((s) => s.isWishlisted);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    productsApi.getShoppingProducts({ category: category || undefined, limit: 30 })
      .then((res) => {
        const rawItems = res?.products || res?.data || (Array.isArray(res) ? res : []);
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
              category: typeof p.category === 'string' ? p.category : p.category?.slug || '',
              inStock: isCatalogProductInStock(p),
            };
          })
          .filter((p: Product) => Boolean(p.id));
        setProducts(dedupeProducts(mapped));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category]));

  const onProductPress = useCallback(
    (item: Product) => {
      navigation.navigate('StationeryDetail', {
        productId: item.id,
        image: item.image || undefined,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
      });
    },
    [navigation],
  );

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }) => (
      <ProductCard
        product={item}
        onPress={() => onProductPress(item)}
        onWishlist={() => toggleWishlist(item.id)}
        isWishlisted={isWishlisted(item.id)}
        compact
      />
    ),
    [isWishlisted, onProductPress, toggleWishlist],
  );

  return (
    <SafeScreen>
      <ScreenHeader
        title="Stationery"
        onBack={() => navigation.goBack()}
        rightElement={
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <SlidersHorizontal size={24} color={t.iconDefault} />
          </View>
        }
      />

      {loading ? (
        <ActivityIndicator size="large" color={t.textPrimary} style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: t.textSecondary }]}>No products available</Text>
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
  list: { flex: 1 },
  columnWrap: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    paddingTop: Spacing.sm,
    gap: 0,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
});
