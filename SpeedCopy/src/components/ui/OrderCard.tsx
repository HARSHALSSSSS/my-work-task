import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Typography, Radii, Shadows, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { Order } from '../../types';
import { formatPrice } from '../../utils/formatCurrency';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

const statusColors: Record<string, string> = {
  placed: Colors.blueAccent,
  confirmed: Colors.blueAccent,
  processing: Colors.warning,
  shipped: Colors.purplePrimary,
  delivered: Colors.green,
  cancelled: Colors.red,
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  const { colors: t } = useThemeStore();
  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: t.card }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Text style={[styles.orderNo, { color: t.textPrimary }]}>{order.orderNumber}</Text>
        <View style={[styles.badge, { backgroundColor: statusColors[order.status] + '20' }]}>
          <Text style={[styles.badgeText, { color: statusColors[order.status] }]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={[styles.date, { color: t.textSecondary }]}>{order.date}</Text>
        <Text style={[styles.total, { color: t.textPrimary }]}>{formatPrice(order.total)}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.itemCount, { color: t.textSecondary }]}>
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </Text>
        <ChevronRight size={18} color={t.chevron} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.section,
    padding: Spacing.lg,
    gap: 10,
    ...Shadows.small,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNo: { ...Typography.bodyBold },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { ...Typography.small, fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { ...Typography.caption },
  total: { ...Typography.bodyBold },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  itemCount: { ...Typography.caption },
});
