import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, MapPin, ShoppingBag, Smartphone } from 'lucide-react-native';
import { Colors, Spacing } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { CartStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/useCartStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { toAbsoluteAssetUrl } from '../../utils/product';
import { fetchCartStockMap, LiveStockState } from '../../utils/stock';

type Nav = NativeStackNavigationProp<CartStackParamList, 'PaymentSummary'>;
type Route = RouteProp<CartStackParamList, 'PaymentSummary'>;

function shadow(e = 2) {
  return Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    android: { elevation: e },
    default: {},
  });
}

export function PaymentScreen() {
  const { colors: t, mode } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const addressId = route.params?.addressId;
  const couponCode = route.params?.couponCode;
  const couponDiscount = route.params?.couponDiscount ?? 0;

  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const addresses = useOrderStore((s) => s.addresses);
  const [stockMap, setStockMap] = useState<Record<string, LiveStockState>>({});

  const basePrice = useMemo(() => getTotal(), [getTotal, items]);
  const deliveryFee = 0;
  const discount = couponDiscount;
  const totalPayable = Math.max(0, basePrice - discount + deliveryFee);
  const originalTotal = basePrice + deliveryFee;

  const address = useMemo(() => {
    if (addressId) {
      const found = addresses.find((a) => a.id === addressId);
      if (found) return found;
    }
    return addresses.find((a) => a.isDefault) ?? addresses[0];
  }, [addressId, addresses]);
  const hasUnavailableItems = useMemo(
    () => items.some((item) => stockMap[item.id] && !stockMap[item.id].inStock),
    [items, stockMap],
  );

  useEffect(() => {
    let active = true;
    fetchCartStockMap(items)
      .then((next) => {
        if (active) setStockMap(next);
      })
      .catch(() => {
        if (active) setStockMap({});
      });
    return () => {
      active = false;
    };
  }, [items]);

  const onPaySecurely = () => {
    if (hasUnavailableItems) {
      return;
    }
    navigation.navigate('PaymentMethod', {
      addressId: address?.id,
      total: totalPayable,
      couponCode,
      couponDiscount,
    });
  };

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerSlot} onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Payment & Summary</Text>
        <View style={styles.headerSlot} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {hasUnavailableItems ? (
          <View
            style={[
              styles.stockAlert,
              {
                backgroundColor: mode === 'dark' ? 'rgba(185, 28, 28, 0.18)' : '#FEF2F2',
                borderColor: mode === 'dark' ? 'rgba(248, 113, 113, 0.45)' : '#FECACA',
              },
            ]}
          >
            <Text style={[styles.stockAlertTitle, { color: mode === 'dark' ? '#FCA5A5' : '#B91C1C' }]}>Some items are out of stock</Text>
            <Text style={[styles.stockAlertText, { color: mode === 'dark' ? '#FECACA' : '#991B1B' }]}>Please return to cart and remove unavailable items.</Text>
          </View>
        ) : null}

        {/* Order Summary Heading */}
        <Text style={[styles.orderTitle, { color: t.textPrimary }]}>Order Summary</Text>
        <Text style={[styles.orderSub, { color: t.textSecondary }]}>Review your order before Payment</Text>

        {/* Item Card */}
        {items.length > 0 ? (
          items.map((item) => (
            <View key={item.id} style={[styles.itemCard, shadow(), { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={styles.itemRow}>
                <View style={[styles.thumbWrap, { backgroundColor: t.chipBg, borderColor: t.border }]}>
                  {item.image ? (
                    <Image source={{ uri: toAbsoluteAssetUrl(item.image) }} style={styles.thumbImage} resizeMode="cover" />
                  ) : (
                    <ShoppingBag size={28} color={t.iconDefault} />
                  )}
                </View>
                <View style={styles.itemBody}>
                  <Text style={[styles.itemName, { color: t.textPrimary }]} numberOfLines={2}>{item.name || 'Product'}</Text>
                  <Text style={[styles.itemDesc, { color: t.textSecondary }]}>
                    {item.printConfig ? `${item.printConfig.printSide === 'two-sided' ? 'Two Sided' : 'One Sided'} | ${item.printConfig.printType === 'stapled' ? 'Staple' : 'Loose'}` : `${formatCurrency(item.price)} x ${item.quantity}`}
                  </Text>
                  <Text style={[styles.itemQty, { color: t.textMuted }]}>Quantity: {String(item.quantity).padStart(2, '0')} Copies</Text>
                  {stockMap[item.id] && !stockMap[item.id].inStock ? (
                    <Text style={styles.itemStockWarning}>{stockMap[item.id].message || 'Out of stock'}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={[styles.itemCard, shadow(), { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[styles.emptyText, { color: t.placeholder }]}>No items in cart</Text>
          </View>
        )}

        {/* Delivery To */}
        <View style={styles.deliveryHeader}>
          <View style={styles.deliveryLeft}>
            <MapPin size={16} color={t.iconDefault} />
            <Text style={[styles.deliveryLabel, { color: t.textPrimary }]}>Delivery To</Text>
          </View>
          <TouchableOpacity>
            <Text style={[styles.homeLink, { color: t.textSecondary }]}>Home</Text>
          </TouchableOpacity>
        </View>

        {address ? (
          <View style={styles.addressBlock}>
            <Text style={[styles.addressLine, { color: t.textSecondary }]}>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</Text>
            <Text style={[styles.addressLine, { color: t.textSecondary }]}>{address.city}, {address.state}</Text>
            <Text style={[styles.addressPin, { color: t.textMuted }]}>Pin: {address.pincode}</Text>
          </View>
        ) : (
          <Text style={[styles.noAddress, { color: t.placeholder }]}>No address selected</Text>
        )}

        <View style={[styles.divider, { backgroundColor: t.divider }]} />

        {/* Payment Method */}
        <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Payment Method</Text>
        <View style={[styles.payMethodCard, shadow(), { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={[styles.payMethodIcon, { backgroundColor: t.chipBg }]}>
            <Smartphone size={18} color={t.iconDefault} />
          </View>
          <View style={styles.payMethodBody}>
            <Text style={[styles.payMethodTitle, { color: t.textPrimary }]}>UPI Payments</Text>
            <Text style={[styles.payMethodSub, { color: t.placeholder }]}>Google Pay, PhonePe, Paytm</Text>
          </View>
          <View style={styles.radioOuter}>
            <View style={styles.radioInner} />
          </View>
        </View>

        {/* Price Details */}
        <View style={[styles.priceCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.priceHeading, { color: t.textPrimary }]}>Price Details</Text>

          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: t.textMuted }]}>Base Price</Text>
            <Text style={[styles.priceValue, { color: t.textPrimary }]}>{formatCurrency(basePrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, styles.greenText]}>
              Discount{couponCode ? ` (${couponCode})` : ''}
            </Text>
            <Text style={[styles.priceValue, styles.greenText]}>
              {discount > 0 ? `-${formatCurrency(discount)}` : formatCurrency(0)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, styles.greenText]}>Delivery charges</Text>
            <Text style={[styles.priceValue, styles.greenText]}>Free</Text>
          </View>

          <View style={[styles.priceDivider, { backgroundColor: mode === 'dark' ? 'rgba(16, 185, 129, 0.22)' : '#D1FAE5' }]} />

          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: t.textPrimary }]}>Total payable</Text>
            <View style={styles.totalRight}>
              <Text style={[styles.totalValue, { color: t.textPrimary }]}>{formatCurrency(totalPayable)}</Text>
              {originalTotal !== totalPayable && (
                <Text style={[styles.totalStrike, { color: t.placeholder }]}>{formatCurrency(originalTotal)}</Text>
              )}
            </View>
          </View>
        </View>

        <Text style={[styles.secureNote, { color: t.placeholder }]}>100% Secure Payment</Text>

        {/* Pay Securely Button */}
        <TouchableOpacity
          style={[styles.payBtn, hasUnavailableItems && styles.disabledBtn]}
          onPress={onPaySecurely}
          activeOpacity={0.9}
          disabled={hasUnavailableItems}
        >
          <Text style={[styles.payBtnText, { color: t.background }]}>Pay Securely</Text>
        </TouchableOpacity>

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[styles.addToCartBtn, { borderColor: t.textPrimary }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Text style={[styles.addToCartText, { color: t.textPrimary }]}>Add to Cart</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scroll: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  stockAlert: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 14,
  },
  stockAlertTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#B91C1C',
  },
  stockAlertText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#991B1B',
    marginTop: 4,
  },
  orderTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    lineHeight: 24,
    color: '#000',
    marginTop: Spacing.xs,
  },
  orderSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: Spacing.sm,
    marginTop: 2,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
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
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  itemDesc: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#6B6B6B',
  },
  itemQty: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#424242',
  },
  itemStockWarning: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 4,
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
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#A5A5A5',
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#242424',
  },
  homeLink: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#6B6B6B',
  },
  addressBlock: {
    marginBottom: 8,
    gap: 2,
  },
  addressLine: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#6B6B6B',
    lineHeight: 20,
  },
  addressPin: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#424242',
    marginTop: 2,
  },
  noAddress: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#A5A5A5',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 16,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#242424',
    marginBottom: 12,
  },
  payMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  payMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payMethodBody: {
    flex: 1,
  },
  payMethodTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#242424',
  },
  payMethodSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#A5A5A5',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F766E',
  },
  priceCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  priceHeading: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#242424',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#424242',
  },
  priceValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#242424',
  },
  greenText: {
    color: '#0F766E',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#D1FAE5',
    marginVertical: 8,
  },
  totalLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#000',
  },
  totalRight: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  totalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#000',
  },
  totalStrike: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#A5A5A5',
    textDecorationLine: 'line-through',
  },
  secureNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#A5A5A5',
    textAlign: 'center',
    marginBottom: 12,
  },
  payBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  disabledBtn: {
    opacity: 0.45,
  },
  payBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  addToCartBtn: {
    borderWidth: 1.5,
    borderColor: '#242424',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addToCartText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#242424',
  },
});

