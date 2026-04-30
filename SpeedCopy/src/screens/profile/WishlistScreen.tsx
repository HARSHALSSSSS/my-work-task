import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ShoppingBag } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { EmptyState } from '../../components/ui/EmptyState';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Spacing } from '../../constants/theme';
import { Product } from '../../types';
import * as productsApi from '../../api/products';
import { isLikelyMongoId, resolveProductImageSource, toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { isCatalogProductInStock } from '../../utils/stock';

function cardShadow() {
  return Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    android: { elevation: 2 },
    default: {},
  });
}

export const WishlistScreen: React.FC = () => {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation();
  const { wishlistIds, toggleWishlist } = useOrderStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wishlistIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    Promise.all(
      wishlistIds.map((id) =>
        isLikelyMongoId(id)
          ? productsApi
              .getProductById(id)
              .then(
                (p) => {
                  const resolvedImage = resolveProductImageSource(p);
                  return ({
                    id: p._id,
                    name: p.name,
                    description: p.description || '',
                    price: resolveProductPricing(p).price,
                    image: resolvedImage.imageUri || toAbsoluteAssetUrl(p.thumbnail || p.images?.[0]),
                    category: p.slug || '',
                    inStock: isCatalogProductInStock(p),
                  } as Product);
                },
              )
              .catch(
                () =>
                  ({
                    id,
                    name: 'Product',
                    description: '',
                    price: 0,
                    image: '',
                    category: '',
                    inStock: true,
                  } as Product),
              )
          : Promise.resolve(
              {
                id,
                name: 'Product',
                description: '',
                price: 0,
                image: '',
                category: '',
                inStock: true,
              } as Product,
            ),
      )
    ).then((results) => {
      setProducts(results.filter(Boolean) as Product[]);
      setLoading(false);
    });
  }, [wishlistIds]);

  const wishlisted = products;

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Wishlist</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={t.textPrimary} style={{ marginTop: 40 }} />
      ) : wishlistIds.length === 0 ? (
        <EmptyState type="wishlist" onAction={() => navigation.goBack()} />
      ) : (
        <FlatList
          data={wishlisted}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.card, cardShadow(), { backgroundColor: t.card }]}>
              {/* Remove link */}
              <View style={styles.removeRow}>
                <TouchableOpacity
                  onPress={() => toggleWishlist(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.removeText, { color: t.textMuted }]}>Remove</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardRow}>
                {/* Thumbnail */}
                <View style={[styles.thumbWrap, { backgroundColor: t.chipBg, borderColor: t.border }]}>
                  {item.image ? (
                    <Image source={{ uri: toAbsoluteAssetUrl(item.image) }} style={styles.thumbImage} resizeMode="cover" />
                  ) : (
                    <ShoppingBag size={28} color={t.iconDefault} />
                  )}
                </View>

                {/* Item Info */}
                <View style={styles.cardBody}>
                  <Text style={[styles.productName, { color: t.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.productDesc, { color: t.textSecondary }]}>{item.description}</Text>
                  <Text style={[styles.productMeta, { color: t.textMuted }]}>Quantity: 01 Copies</Text>
                </View>

              </View>
            </View>
          )}
        />
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
    color: '#242424',
    textAlign: 'center',
  },
  list: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  removeRow: {
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  removeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#424242',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  productDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#6B6B6B',
    lineHeight: 18,
    minHeight: 18,
  },
  productMeta: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#424242',
    lineHeight: 18,
  },
  expressBadge: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 6,
  },
  expressTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#242424',
  },
  expressSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B6B6B',
    textAlign: 'center',
  },
});

