import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { CompositeNavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronLeft, HelpCircle, MapPin } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { AppTabParamList, CartStackParamList, OrdersStackParamList, ProfileStackParamList } from '../../navigation/types';
import { Order, TrackingStep } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { resolveProductImageSource } from '../../utils/product';
import * as ordersApi from '../../api/orders';
import * as deliveryApi from '../../api/delivery';
import { useSocketEvent } from '../../hooks/useSocket';
import { resolvePickupEtaLabel } from '../../utils/pickupEta';

/** Screen is registered on Cart, Profile, and Orders stacks; cart + tab covers navigate-to-tab cases. */
type TrackingNav = CompositeNavigationProp<
  NativeStackNavigationProp<CartStackParamList>,
  BottomTabNavigationProp<AppTabParamList>
>;

type TrackingRoute =
  | RouteProp<CartStackParamList, 'TrackOrder'>
  | RouteProp<OrdersStackParamList, 'Tracking'>
  | RouteProp<ProfileStackParamList, 'Tracking'>;

const cardShadow = Platform.select({
  ios: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
});
// Keeps footer content above the floating bottom tab bar.
const FLOATING_TAB_SAFE_CLEARANCE = 64;

function formatOrderIdLabel(orderNumber: string): string {
  return `#${orderNumber.replace(/-/g, '/')}`;
}

type StepVisual = {
  title: string;
  description: string;
  time?: string;
  state: 'done' | 'current' | 'pending' | 'pickupPending';
};

function mapSteps(order: Order): StepVisual[] {
  const steps = order.trackingSteps;
  if (steps.length >= 4) {
    return steps.slice(0, 4).map((s, i) => ({
      title: s.title,
      description: s.subtitle,
      time: s.time,
      state: stepStateFromTracking(s, i),
    }));
  }
  const dateObj = new Date(order.date);
  const dateStr = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const progress = progressFromStatus(order.status);
  return [
    {
      title: 'Order Confirmed',
      description: 'Your order has been confirmed',
      time: `${dateStr}, ${timeStr}`,
      state: progress >= 0 ? 'done' : 'pending',
    },
    {
      title: 'Printing',
      description: 'Quality Check completed',
      state: progress >= 1 ? 'done' : progress === 0 ? 'current' : 'pending',
    },
    {
      title: 'Out for delivery',
      description: 'Waiting for dispatch',
      state: progress >= 2 ? 'done' : progress === 1 ? 'current' : 'pending',
    },
    {
      title: 'Delivered',
      description: 'Your order has been delivered',
      state: progress >= 3 ? 'done' : 'pickupPending',
    },
  ];
}

function stepStateFromTracking(s: TrackingStep, index: number): StepVisual['state'] {
  if (s.completed) return 'done';
  if (s.active) return index === 3 ? 'pickupPending' : 'current';
  if (index === 3) return 'pickupPending';
  return 'pending';
}

function progressFromStatus(status: Order['status']): number {
  switch (status) {
    case 'placed':
    case 'confirmed':
      return 1;
    case 'processing':
      return 1;
    case 'shipped':
      return 2;
    case 'delivered':
      return 3;
    case 'cancelled':
      return 0;
    default:
      return 1;
  }
}

function getOrderHeroTitle(status: Order['status']): string {
  switch (status) {
    case 'delivered':
      return 'Order Delivered';
    case 'shipped':
      return 'Order On The Way';
    case 'cancelled':
      return 'Order Cancelled';
    case 'processing':
      return 'Order Processing';
    case 'confirmed':
      return 'Order Confirmed';
    default:
      return 'Order Placed';
  }
}

function getOrderHeroSubtitle(order: Order): string {
  const firstItem = order.items[0]?.name || 'your order';
  switch (order.status) {
    case 'delivered':
      return `${firstItem} has been delivered successfully`;
    case 'shipped':
      return `${firstItem} is out for delivery`;
    case 'cancelled':
      return `${firstItem} was cancelled`;
    case 'processing':
      return `${firstItem} is being prepared`;
    case 'confirmed':
      return `${firstItem} has been confirmed`;
    default:
      return `${firstItem} has been placed successfully`;
  }
}

function hasMeaningfulAddress(address?: Order['address']): boolean {
  if (!address) return false;
  return Boolean(
    address.line1
    || address.line2
    || address.city
    || address.state
    || address.pincode,
  );
}

function formatAddressParts(parts: Array<string | undefined>): string {
  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(', ');
}

export const TrackingScreen: React.FC = () => {
  const { colors: t } = useThemeStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TrackingNav>();
  const { params } = useRoute<TrackingRoute>();
  const orderId = params.orderId;
  const storeOrders = useOrderStore((s) => s.orders);
  const updateOrderInStore = useOrderStore((s) => s.addOrder);
  const localOrder = storeOrders.find((o) => o.id === orderId);

  const [order, setOrder] = useState<Order | undefined>(localOrder);

  const steps = useMemo(() => (order ? mapSteps(order) : []), [order]);

  const [deliveryEta, setDeliveryEta] = useState<number | undefined>();
  const [pickupEtaLabel, setPickupEtaLabel] = useState('');
  const [deliveryTracking, setDeliveryTracking] = useState<deliveryApi.DeliveryTracking | null>(null);
  const footerBottomPadding = Math.max(Spacing.xl, FLOATING_TAB_SAFE_CLEARANCE + insets.bottom);
  const isLikelyPickupOrder = useMemo(() => (
    Boolean(deliveryTracking?.pickup)
    || Boolean(order?.address?.id?.startsWith('pickup-'))
    || !hasMeaningfulAddress(order?.address)
  ), [deliveryTracking?.pickup, order?.address]);
  const pickupLocationName = String(deliveryTracking?.pickup?.name || '').trim();
  const pickupAddress = formatAddressParts([
    deliveryTracking?.pickup?.address,
    deliveryTracking?.pickup?.addressLine,
  ]);
  const etaHeadline = isLikelyPickupOrder
    ? pickupEtaLabel
    : deliveryEta != null
      ? `Arriving in about ${deliveryEta} min`
      : '';
  const statusCardTitle = isLikelyPickupOrder ? 'Pickup status' : 'Delivery status';
  const statusCardSubtitle = isLikelyPickupOrder
    ? (pickupLocationName || 'Store pickup selected')
    : 'Live delivery estimate';
  const statusCardMeta = isLikelyPickupOrder
    ? pickupAddress
    : formatAddressParts([
        order?.address?.line1,
        order?.address?.line2,
        order?.address ? `${order.address.city}, ${order.address.state} ${order.address.pincode}` : '',
      ]);

  // Listen for real-time order status updates
  useSocketEvent('order:statusUpdate', (data: any) => {
    if (data?.orderId === orderId && order) {
      const statusMap: Record<string, Order['status']> = {
        pending: 'processing', confirmed: 'processing', processing: 'processing',
        assigned_vendor: 'processing', vendor_accepted: 'processing',
        in_production: 'processing', qc_pending: 'processing',
        printing: 'processing', quality_check: 'processing', packed: 'processing',
        ready_for_pickup: 'shipped', delivery_assigned: 'shipped',
        out_for_delivery: 'shipped', delivered: 'delivered',
        cancelled: 'cancelled', refunded: 'cancelled',
      };
      const newStatus = statusMap[data.status] || order.status;
      const updatedOrder = { ...order, status: newStatus };
      setOrder(updatedOrder);
      updateOrderInStore(updatedOrder);
    }
  });

  // Listen for real-time delivery location updates
  useSocketEvent('delivery:location', (data: any) => {
    if (data?.orderId !== orderId) return;

    if (data.etaMinutes) {
      setDeliveryEta(data.etaMinutes);
    }

    const nextPickupEta = resolvePickupEtaLabel(data, '');
    if (nextPickupEta) {
      setPickupEtaLabel(nextPickupEta);
    }
  });

  useEffect(() => {
    if (!orderId) return;

    const statusMap: Record<string, Order['status']> = {
      pending: 'processing', confirmed: 'processing', processing: 'processing',
      assigned_vendor: 'processing', vendor_accepted: 'processing',
      in_production: 'processing', qc_pending: 'processing',
      printing: 'processing', quality_check: 'processing', packed: 'processing',
      ready_for_pickup: 'shipped', delivery_assigned: 'shipped',
      out_for_delivery: 'shipped', delivered: 'delivered',
      cancelled: 'cancelled', refunded: 'cancelled',
    };

    ordersApi.trackOrder(orderId)
      .then((trackView: any) => {
        const backendStatus = trackView.status || 'pending';
        const customerLabel = trackView.customerFacingStatus || backendStatus;

        const timelineSteps = (trackView.timeline || []).map((t: any, i: number, arr: any[]) => ({
          title: t.customerLabel || t.status?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || '',
          subtitle: t.note || '',
          time: t.timestamp ? new Date(t.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
          completed: i < arr.length - 1,
          active: i === arr.length - 1,
        }));

        if (trackView.estimatedDelivery) {
          setDeliveryEta(trackView.estimatedDelivery);
        }

        const mapped: Order = {
          id: orderId,
          orderNumber: trackView.orderNumber || orderId,
          status: statusMap[backendStatus] || 'processing',
          items: localOrder?.items || [],
          total: localOrder?.total || 0,
          date: trackView.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          address: trackView.shippingAddress ? {
            id: 'ship', name: trackView.shippingAddress.fullName || '', phone: trackView.shippingAddress.phone || '',
            line1: trackView.shippingAddress.line1 || '', line2: trackView.shippingAddress.line2 || '',
            city: trackView.shippingAddress.city || '', state: trackView.shippingAddress.state || '',
            pincode: trackView.shippingAddress.pincode || '', isDefault: false,
          } : (localOrder?.address || { id: '', name: '', phone: '', line1: '', city: '', state: '', pincode: '', isDefault: false }),
          trackingSteps: timelineSteps.length ? timelineSteps : (localOrder?.trackingSteps || []),
        };
        setOrder(mapped);
        updateOrderInStore(mapped);
      })
      .catch(() => {
        ordersApi.getOrder(orderId)
          .then((backendOrder) => {
            const mapped: Order = {
              id: backendOrder._id,
              orderNumber: backendOrder.orderNumber,
              status: statusMap[backendOrder.status] || 'processing',
              items: (backendOrder.items || []).map((i: any) => {
                const { imageUri } = resolveProductImageSource(
                  i,
                  i?.variantSnapshot,
                  i?.variant_snapshot,
                  i?.productSnapshot,
                  i?.product_snapshot,
                  i?.snapshot,
                );

                return {
                  id: i.productId || i._id,
                  type: 'product',
                  quantity: i.quantity,
                  price: i.unitPrice,
                  name: i.productName,
                  image: imageUri || i.thumbnail || i.image || '',
                  flowType: i.flowType,
                };
              }),
              total: backendOrder.total,
              date: backendOrder.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              address: backendOrder.shippingAddress ? {
                id: 'ship', name: backendOrder.shippingAddress.fullName || '', phone: backendOrder.shippingAddress.phone || '',
                line1: backendOrder.shippingAddress.line1 || '', line2: backendOrder.shippingAddress.line2 || '',
                city: backendOrder.shippingAddress.city || '', state: backendOrder.shippingAddress.state || '',
                pincode: backendOrder.shippingAddress.pincode || '', isDefault: false,
              } : (localOrder?.address || { id: '', name: '', phone: '', line1: '', city: '', state: '', pincode: '', isDefault: false }),
              trackingSteps: backendOrder.timeline?.length
                ? backendOrder.timeline.map((t: any) => ({
                    title: t.title || t.status, subtitle: t.description || '', time: t.timestamp || '',
                    completed: !!t.completed, active: !!t.active,
                  }))
                : (localOrder?.trackingSteps || []),
            };
            setOrder(mapped);
            updateOrderInStore(mapped);
          })
          .catch(() => {});
      });

    deliveryApi.trackDelivery(orderId)
      .then((res) => {
        setDeliveryTracking(res);
        if (res.etaMinutes) setDeliveryEta(res.etaMinutes);
        const nextPickupEta = resolvePickupEtaLabel(res, '');
        if (nextPickupEta) setPickupEtaLabel(nextPickupEta);
      })
      .catch(() => {});
  }, [orderId]);

  const onTrackMap = useCallback(() => {
    if (!order) return;
    const q = isLikelyPickupOrder
      ? formatAddressParts([
          pickupLocationName,
          deliveryTracking?.pickup?.address,
          deliveryTracking?.pickup?.addressLine,
        ])
      : formatAddressParts([
          order.address.line1,
          order.address.line2,
          `${order.address.city}, ${order.address.state} ${order.address.pincode}`,
        ]);
    if (!q) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(q)}`,
      android: `geo:0,0?q=${encodeURIComponent(q)}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
    });
    Linking.openURL(url);
  }, [deliveryTracking?.pickup?.address, deliveryTracking?.pickup?.addressLine, isLikelyPickupOrder, order, pickupLocationName]);

  const onHelp = useCallback(() => {
    navigation.getParent()?.navigate('ProfileTab', { screen: 'Support' });
  }, [navigation]);

  if (!order) {
    return (
      <SafeScreen>
        <View style={styles.missingHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={28} color={t.iconDefault} />
          </TouchableOpacity>
          <Text style={[styles.headerTitleCenter, { color: t.textPrimary }]}>Track Order</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.missingBody}>
          <Text style={[styles.missingTitle, { color: t.textPrimary }]}>Order not found</Text>
          <Text style={[styles.missingHint, { color: t.textSecondary }]}>This order may have been removed or the link is invalid.</Text>
        </View>
      </SafeScreen>
    );
  }

  const idLabel = formatOrderIdLabel(order.orderNumber);
  const heroTitle = getOrderHeroTitle(order.status);
  const heroSubtitle = getOrderHeroSubtitle(order);

  return (
    <SafeScreen>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={28} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitleCenter, { color: t.textPrimary }]}>Track Order</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.successCircle}>
            <Check size={36} color={Colors.surface} strokeWidth={3} />
          </View>
          <Text style={[styles.confirmedTitle, { color: t.textPrimary }]}>{heroTitle}</Text>
          <Text style={[styles.metaLine, { color: t.textSecondary }]}>{heroSubtitle}</Text>
          <View style={[styles.heroMetaPill, { backgroundColor: t.card, borderColor: t.divider }]}>
            <Text style={[styles.heroMetaText, { color: t.textSecondary }]}>Order Id: {idLabel}</Text>
            <View style={[styles.heroMetaDivider, { backgroundColor: t.divider }]} />
            <Text style={[styles.heroMetaText, { color: t.textSecondary }]}>Total: {formatCurrency(order.total)}</Text>
          </View>
        </View>

        {(etaHeadline || statusCardMeta || statusCardSubtitle) ? (
          <View style={[styles.statusCard, cardShadow, { backgroundColor: t.card, borderColor: t.divider }]}>
            <View style={styles.statusCardHeader}>
              <View style={styles.statusCardCopy}>
                <Text style={[styles.statusCardLabel, { color: t.textSecondary }]}>{statusCardTitle}</Text>
                <Text style={[styles.statusCardTitle, { color: t.textPrimary }]}>{statusCardSubtitle}</Text>
              </View>
              {etaHeadline ? (
                <View style={styles.statusEtaChip}>
                  <Text style={styles.statusEtaChipText}>{etaHeadline}</Text>
                </View>
              ) : null}
            </View>
            {statusCardMeta ? (
              <View style={styles.statusCardMetaRow}>
                <MapPin size={16} color={t.iconDefault} />
                <Text style={[styles.statusCardMetaText, { color: t.textSecondary }]}>{statusCardMeta}</Text>
              </View>
            ) : null}
            <View style={styles.actionRow}>
              <ButtonOutline
                icon={<MapPin size={18} color={t.iconDefault} />}
                label={isLikelyPickupOrder ? 'View Pickup Location' : 'Track on Map'}
                onPress={onTrackMap}
                containerStyle={styles.actionBtn}
              />
              <ButtonOutline
                icon={<HelpCircle size={18} color={t.iconDefault} />}
                label="Need Help?"
                onPress={onHelp}
                containerStyle={styles.actionBtn}
              />
            </View>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Order Status</Text>

        <View style={[styles.timelineCard, cardShadow, { backgroundColor: t.card }]}>
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const connectorComplete = step.state === 'done';
            const titleBold = step.state === 'done' || step.state === 'current';
            return (
              <View key={`${step.title}-${idx}`} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <StepDot state={step.state} />
                  {!isLast ? (
                    <View
                      style={[
                        styles.connector,
                        { backgroundColor: connectorComplete ? Colors.green : t.divider },
                      ]}
                    />
                  ) : null}
                </View>
                <View style={styles.stepBody}>
                  <Text
                    style={[
                      styles.stepTitle,
                      { color: t.textSecondary },
                      titleBold && [styles.stepTitleActive, { color: t.textPrimary }],
                    ]}
                  >
                    {step.title}
                  </Text>
                  {step.time ? <Text style={[styles.stepTime, { color: t.textMuted }]}>{step.time}</Text> : null}
                  <Text style={[styles.stepDesc, { color: t.textSecondary }]}>{step.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: t.divider, backgroundColor: t.background, paddingBottom: footerBottomPadding }]}>
        <Text style={[styles.footerNote, { color: t.textMuted }]}>
          {isLikelyPickupOrder
            ? 'Pickup readiness updates will appear here as soon as the store sends them.'
            : 'Live tracking updates will appear here as the order moves closer to you.'}
        </Text>
      </View>
    </SafeScreen>
  );
};

function StepDot({ state }: { state: StepVisual['state'] }) {
  const { colors: t } = useThemeStore();
  if (state === 'done') {
    return (
      <View style={styles.dotDone}>
        <Check size={12} color={Colors.surface} strokeWidth={3} />
      </View>
    );
  }
  if (state === 'pickupPending') {
    return (
      <View style={[styles.dotPickup, { borderColor: t.border, backgroundColor: t.card }]}>
        <Check size={12} color={Colors.green} strokeWidth={3} />
      </View>
    );
  }
  return (
    <View
      style={[
        styles.dotBase,
        { borderColor: t.border, backgroundColor: t.card },
        state === 'current' && styles.dotCurrent,
      ]}
    />
  );
}

function ButtonOutline({
  label,
  onPress,
  icon,
  containerStyle,
}: {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const { colors: t } = useThemeStore();
  return (
    <TouchableOpacity
      style={[styles.outlineBtn, containerStyle, cardShadow, { borderColor: t.textPrimary, backgroundColor: t.card }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {icon}
      <Text style={[styles.outlineBtnText, { color: t.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 6,
    paddingBottom: 12,
  },
  missingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitleCenter: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textDark,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: { width: 28 },
  content: {
    paddingTop: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: Colors.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  confirmedTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  metaLine: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  heroMetaPill: {
    marginTop: Spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroMetaText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  heroMetaDivider: {
    width: 1,
    height: 14,
  },
  statusCard: {
    borderRadius: Radii.section,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statusCardCopy: {
    flex: 1,
    gap: 2,
  },
  statusCardLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusCardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  statusEtaChip: {
    backgroundColor: '#0F766E14',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusEtaChipText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    lineHeight: 16,
    color: '#0F766E',
  },
  statusCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  statusCardMetaText: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.section,
    padding: Spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 88,
  },
  stepRail: {
    alignItems: 'center',
    width: 28,
    marginRight: Spacing.md,
  },
  dotBase: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.gray,
    backgroundColor: Colors.surface,
  },
  dotCurrent: {
    borderColor: Colors.green,
    borderWidth: 3,
  },
  dotDone: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPickup: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: Colors.borderGray,
    marginVertical: 4,
  },
  connectorDone: {
    backgroundColor: Colors.green,
  },
  stepBody: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  stepTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  stepTitleActive: {
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textDark,
  },
  stepTime: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textMuted,
    marginTop: 2,
  },
  stepDesc: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.borderGray,
    backgroundColor: Colors.background,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 8 },
    }),
  },
  footerNote: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: Colors.black,
    backgroundColor: Colors.surface,
    alignSelf: 'stretch',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
  outlineBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textDark,
  },
  missingBody: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missingTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.textDark,
    marginBottom: Spacing.sm,
  },
  missingHint: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

