import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShoppingCart, Bell, Heart } from 'lucide-react-native';
import { Typography, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { Button } from './Button';

type EmptyType = 'cart' | 'notifications' | 'wishlist' | 'orders';

interface EmptyStateProps {
  type: EmptyType;
  onAction?: () => void;
}

const config: Record<EmptyType, { icon: React.ElementType; title: string; subtitle: string; action: string }> = {
  cart: {
    icon: ShoppingCart,
    title: 'Your cart is empty',
    subtitle: 'Looks like you haven\'t added anything yet',
    action: 'Start Shopping',
  },
  notifications: {
    icon: Bell,
    title: 'No notifications yet',
    subtitle: 'We\'ll notify you when something important happens',
    action: 'Go Home',
  },
  wishlist: {
    icon: Heart,
    title: 'Your wishlist is empty',
    subtitle: 'Save items you love to your wishlist',
    action: 'Browse Products',
  },
  orders: {
    icon: ShoppingCart,
    title: 'No orders yet',
    subtitle: 'Start placing orders to see them here',
    action: 'Start Shopping',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onAction }) => {
  const { colors: t } = useThemeStore();
  const c = config[type];
  const Icon = c.icon;
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon size={64} color={t.placeholder} strokeWidth={1.2} />
      </View>
      <Text style={[styles.title, { color: t.textPrimary }]}>{c.title}</Text>
      <Text style={[styles.subtitle, { color: t.textSecondary }]}>{c.subtitle}</Text>
      {onAction && (
        <Button title={c.action} onPress={onAction} style={styles.btn} fullWidth={false} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxxl },
  iconWrap: { marginBottom: 24 },
  title: { ...Typography.h3, textAlign: 'center', marginBottom: 8 },
  subtitle: { ...Typography.body, textAlign: 'center', marginBottom: 24 },
  btn: { paddingHorizontal: 32 },
});
