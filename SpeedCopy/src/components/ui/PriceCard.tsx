import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radii, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { formatPrice } from '../../utils/formatCurrency';

interface PriceCardProps {
  basePrice: number;
  discount: number;
  total: number;
  originalTotal?: number;
}

export const PriceCard: React.FC<PriceCardProps> = ({
  basePrice,
  discount,
  total,
  originalTotal,
}) => {
  const { colors: t } = useThemeStore();
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: t.textSecondary }]}>Base Price</Text>
        <Text style={[styles.priceGray, { color: t.textMuted }]}>{formatPrice(basePrice)}</Text>
      </View>
      <View style={styles.row}>
        <View>
          <Text style={styles.discountLabel}>Discount</Text>
          <Text style={styles.discountSub}>You saved ₹{discount} on this order</Text>
        </View>
        <Text style={styles.discountValue}>{formatPrice(-discount)}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: t.divider }]} />
      <View style={styles.row}>
        <Text style={[styles.totalLabel, { color: t.textPrimary }]}>Total payable</Text>
        <View style={styles.totalRow}>
          <Text style={[styles.totalValue, { color: t.textPrimary }]}>{formatPrice(total)}</Text>
          {originalTotal && originalTotal !== total && (
            <Text style={[styles.strikethrough, { color: t.textSecondary }]}>{formatPrice(originalTotal)}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.blueLightBg,
    borderRadius: Radii.section,
    borderWidth: 1,
    borderColor: Colors.blueAccent,
    padding: Spacing.lg,
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...Typography.bodyBold },
  priceGray: { ...Typography.h3, fontSize: 21 },
  discountLabel: { ...Typography.body, color: Colors.green },
  discountSub: { ...Typography.body, color: Colors.green, fontSize: 12 },
  discountValue: { ...Typography.h3, fontSize: 21, color: Colors.green },
  divider: { height: 0.5 },
  totalLabel: { ...Typography.h3 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalValue: { ...Typography.h3, fontSize: 21 },
  strikethrough: {
    ...Typography.caption,
    textDecorationLine: 'line-through',
  },
});
