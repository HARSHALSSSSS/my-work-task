import React, { useCallback, useEffect, useState } from 'react';
import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { CompositeNavigationProp, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Radii, Shadows, Spacing, Typography } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Button } from '../../components/ui/Button';
import { CartToast } from '../../components/ui/CartToast';
import { Input } from '../../components/ui/Input';
import { QuantityPicker } from '../../components/ui/QuantityPicker';
import { AppTabParamList, GiftStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/useCartStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Product } from '../../types';
import { formatPrice } from '../../utils/formatCurrency';
import * as productsApi from '../../api/products';
import { toAbsoluteAssetUrl } from '../../utils/product';
import { resolveProductPricing } from '../../utils/pricing';
import { isCatalogProductInStock } from '../../utils/stock';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<GiftStackParamList, 'GiftProductDetail'>,
  BottomTabNavigationProp<AppTabParamList>
>;
type Route = RouteProp<GiftStackParamList, 'GiftProductDetail'>;

const IMG_MUG = require('../../../assets/images/gift-prod-mug.png');

export function GiftDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { productId } = route.params;
  const { colors: t } = useThemeStore();

  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [giftImage, setGiftImage] = useState<ImageSourcePropType>(IMG_MUG);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [customText, setCustomText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    productsApi.getGiftingProduct(productId)
      .then((p) => {
        const { price, originalPrice } = resolveProductPricing(p);
        setProduct({
          id: p._id,
          name: p.name,
          description: p.description || '',
          price,
          originalPrice,
          image: toAbsoluteAssetUrl(p.thumbnail || p.images?.[0]),
          category: typeof p.category === 'object' ? (p.category as any)?.name : (p.category as string || ''),
          inStock: isCatalogProductInStock(p),
        });
        const thumbnail = toAbsoluteAssetUrl(p.thumbnail || p.images?.[0]);
        if (thumbnail) {
          setGiftImage({ uri: thumbnail });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const lineId = `gift-${product.id}-${customText.trim() || 'default'}`;
    const displayName = customText.trim()
      ? `${product.name} ('${customText.trim()}')`
      : product.name;

    addItem({
      id: lineId,
      backendProductId: product.id,
      type: 'product',
      flowType: 'gifting',
      quantity,
      price: product.price,
      name: displayName,
      image: product.image,
      product: {
        ...product,
        name: displayName,
        description: customText.trim()
          ? `${product.description} Custom: ${customText.trim()}`
          : product.description,
      },
    });
    setToastVisible(true);
  }, [addItem, customText, product, quantity]);

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.missingHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeft size={24} color={t.iconDefault} />
          </TouchableOpacity>
          <Text style={[styles.missingTitle, { color: t.textPrimary }]}>Loading...</Text>
        </View>
        <ActivityIndicator size="large" color={t.textPrimary} style={{ marginTop: 40 }} />
      </SafeScreen>
    );
  }

  if (!product) {
    return (
      <SafeScreen>
        <View style={styles.missingHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <ChevronLeft size={24} color={t.iconDefault} />
          </TouchableOpacity>
          <Text style={[styles.missingTitle, { color: t.textPrimary }]}>Gift not found</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
      </View>

      <CartToast
        visible={toastVisible}
        productName={product.name}
        onDismiss={() => setToastVisible(false)}
        onViewCart={() => {
          setToastVisible(false);
          navigation.navigate('CartTab', { screen: 'Cart' });
        }}
      />

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.imageArea}>
          <Image source={giftImage} style={styles.giftImage} resizeMode="cover" />
        </View>

        <Text style={[styles.title, { color: t.textPrimary }]}>{product.name}</Text>

        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: t.textPrimary }]}>{formatPrice(product.price)}</Text>
          {product.originalPrice != null && (
            <Text style={[styles.oldPrice, { color: t.textSecondary }]}>{formatPrice(product.originalPrice)}</Text>
          )}
        </View>

        <Text style={[styles.description, { color: t.textSecondary }]}>{product.description}</Text>

        <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Customization</Text>
        <Input
          label="Custom text"
          placeholder="Name, date, or short message"
          value={customText}
          onChangeText={setCustomText}
          multiline
        />

        <View style={styles.qtyBlock}>
          <QuantityPicker label="Quantity" value={quantity} onChange={setQuantity} min={1} max={99} />
        </View>

        <Button title="Add to Cart" onPress={handleAddToCart} variant="primary" size="lg" />
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  missingHeader: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  missingTitle: { ...Typography.h3, color: Colors.textDark },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  imageArea: {
    height: 260,
    borderRadius: Radii.card,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  giftImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radii.card,
  },
  title: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  price: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  oldPrice: {
    ...Typography.body,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  qtyBlock: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
