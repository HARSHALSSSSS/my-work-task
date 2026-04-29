import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Heart, ShoppingBag } from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { Product } from '../../types';
import { formatPrice } from '../../utils/formatCurrency';
import { getProductImageCandidates, toAbsoluteAssetUrl } from '../../utils/product';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onWishlist?: () => void;
  isWishlisted?: boolean;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onWishlist,
  isWishlisted = false,
  compact = false,
}) => {
  const { colors: t } = useThemeStore();
  const imageCandidates = React.useMemo(() => {
    const candidates = getProductImageCandidates(product);
    if (candidates.length > 0) return candidates;
    const fallback = toAbsoluteAssetUrl(product.image);
    return fallback ? [fallback] : [];
  }, [product]);
  const [imageIndex, setImageIndex] = React.useState(0);
  React.useEffect(() => {
    setImageIndex(0);
  }, [product.id, product.image]);
  const imageUri = imageCandidates[imageIndex] || '';
  const showImage = Boolean(imageUri);
  const discountLabel =
    typeof product.discountLabel === 'string' && product.discountLabel.trim()
      ? product.discountLabel.trim()
      : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: t.card,
          borderColor: t.divider,
        },
        compact && styles.compact,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.imageWrap, { backgroundColor: t.chipBg }]}>
        {showImage ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImageIndex((prev) => (prev + 1 < imageCandidates.length ? prev + 1 : imageCandidates.length))}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <ShoppingBag size={36} color={t.placeholder} strokeWidth={1.2} />
          </View>
        )}
        {discountLabel && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountLabel}</Text>
          </View>
        )}
        {!product.inStock && (
          <View style={[styles.stockBadge, { backgroundColor: t.surface }]}>
            <Text style={[styles.stockText, { color: t.textSecondary }]}>Out of stock</Text>
          </View>
        )}
        {onWishlist && (
          <TouchableOpacity style={[styles.wishlistBtn, { backgroundColor: t.surface }]} onPress={onWishlist}>
            <Heart
              size={18}
              color={isWishlisted ? Colors.red : t.textSecondary}
              fill={isWishlisted ? Colors.red : 'none'}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: t.textPrimary }]} numberOfLines={2}>{product.name}</Text>
        {product.description ? (
          <Text style={[styles.description, { color: t.textSecondary }]} numberOfLines={1}>
            {product.description}
          </Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: t.textPrimary }]}>{formatPrice(product.price)}</Text>
          {product.originalPrice && (
            <Text style={[styles.oldPrice, { color: t.textSecondary }]}>{formatPrice(product.originalPrice)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.card,
    overflow: 'hidden',
    width: '48%',
    borderWidth: 1,
    minHeight: 246,
    ...Shadows.small,
  },
  compact: { width: '47.5%' },
  imageWrap: { height: 156, position: 'relative' },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  discountText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 9.5,
    color: Colors.green,
  },
  stockBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
  },
  info: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14, gap: 5 },
  name: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    lineHeight: 19,
    minHeight: 38,
  },
  description: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 16,
    minHeight: 16,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  price: {
    ...Typography.bodyBold,
    fontSize: 15,
    lineHeight: 20,
  },
  oldPrice: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 16,
    textDecorationLine: 'line-through',
  },
});
