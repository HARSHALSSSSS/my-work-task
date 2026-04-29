import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  Building2,
  ChevronLeft,
  CreditCard,
  Lock,
  Shield,
  Smartphone,
  Tag,
  Wallet,
} from 'lucide-react-native';
import { Spacing } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { AppTabParamList, CartStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/useCartStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { CartItem, Order, TrackingStep } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { inferFlowTypeFromItemId, isLikelyMongoId } from '../../utils/product';
import { fetchCartStockMap, LiveStockState } from '../../utils/stock';
import * as ordersApi from '../../api/orders';
import * as paymentsApi from '../../api/payments';
import { useAuthStore } from '../../store/useAuthStore';
import { RazorpayCheckout, RazorpayOptions, RazorpaySuccess } from '../../components/payment/RazorpayCheckout';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<CartStackParamList, 'PaymentMethod'>,
  BottomTabNavigationProp<AppTabParamList>
>;
type Route = RouteProp<CartStackParamList, 'PaymentMethod'>;

type PayMethod = 'card' | 'upi' | 'wallet' | 'netbanking';

function isUpiFormatValid(value: string): boolean {
  return /^[a-z0-9._-]{2,256}@[a-z][a-z0-9.-]{1,63}$/i.test(value.trim().toLowerCase());
}

function shadow(e = 2) {
  return Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    android: { elevation: e },
    default: {},
  });
}

function buildTrackingSteps(): TrackingStep[] {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return [
    { title: 'Order Confirmed', subtitle: 'Your order has been received and is being processed', time: `${dateStr}, ${timeStr}`, completed: true, active: false },
    { title: 'Printing', subtitle: 'Quality Check completed', time: '', completed: true, active: false },
    { title: 'Out for delivery', subtitle: 'We will notify you when the rider is on the way', time: '', completed: false, active: true },
    { title: 'Delivered', subtitle: 'Your order has been delivered', time: '', completed: false, active: false },
  ];
}

export function PaymentMethodScreen() {
  const { colors: t, mode: themeMode } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const addressId = route.params?.addressId;
  const couponCode = route.params?.couponCode?.trim() || '';
  const couponDiscount = route.params?.couponDiscount ?? 0;

  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const backendCartId = useCartStore((s) => s.backendCartId);
  const addresses = useOrderStore((s) => s.addresses);
  const walletBalance = useOrderStore((s) => s.walletBalance);
  const addOrder = useOrderStore((s) => s.addOrder);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const fetchWallet = useOrderStore((s) => s.fetchWallet);

  const [method, setMethod] = useState<PayMethod>('upi');
  const [upiId, setUpiId] = useState('');
  const [upiVerifyState, setUpiVerifyState] = useState<'idle' | 'verifying' | 'verified' | 'invalid'>('idle');
  const [upiVerifyMessage, setUpiVerifyMessage] = useState('');
  const [checkMobile, setCheckMobile] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, LiveStockState>>({});

  const basePrice = useMemo(() => getTotal(), [getTotal, items]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const originalTotal = basePrice + deliveryFee;
  const totalPayable = Math.max(0, originalTotal - couponDiscount);
  const hasUnavailableItems = useMemo(
    () => items.some((item) => stockMap[item.id] && !stockMap[item.id].inStock),
    [items, stockMap],
  );

  useEffect(() => { fetchWallet(); }, [fetchWallet]);
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

  const address = useMemo(() => {
    if (addressId) {
      const found = addresses.find((a) => a.id === addressId);
      if (found) return found;
    }
    return addresses.find((a) => a.isDefault) ?? addresses[0];
  }, [addressId, addresses]);

  const [paying, setPaying] = useState(false);
  const [rzpOptions, setRzpOptions] = useState<RazorpayOptions | null>(null);
  const [pendingOrder, setPendingOrder] = useState<ordersApi.BackendOrder | null>(null);
  const [walletCheckoutUnavailable, setWalletCheckoutUnavailable] = useState(false);
  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);
  const userPhone = useAuthStore((s) => s.phone);

  const normalizeDisplayAmount = useCallback((backendAmount: number | undefined, fallbackRupees: number) => {
    if (!backendAmount || !Number.isFinite(backendAmount)) return fallbackRupees;
    // payment-service returns amount in paise. Razorpay checkout options expect rupees here
    // because RazorpayCheckout multiplies by 100 before passing to checkout.js.
    return backendAmount > fallbackRupees * 10 ? backendAmount / 100 : backendAmount;
  }, []);

  const resolveFlowType = useCallback((item: CartItem): 'printing' | 'gifting' | 'shopping' => {
    if (item.flowType) return item.flowType;
    if (item.type === 'printing') return 'printing';
    if (item.type === 'gifting') return 'gifting';
    if (item.id.startsWith('gift-') || item.id.startsWith('custom-gifting')) return 'gifting';
    return inferFlowTypeFromItemId(item.id);
  }, []);

  const singleFlowType = useMemo(() => {
    const unique = Array.from(new Set(items.map((item) => resolveFlowType(item))));
    return unique.length === 1 ? unique[0] : null;
  }, [items, resolveFlowType]);

  const pickupShopIdForOrder = useMemo(() => {
    if (!items.length) return null;
    const allPrinting = items.every((item) => resolveFlowType(item) === 'printing');
    if (!allPrinting) return null;

    const pickupIds = items
      .map((item) => {
        const shopId = item.printConfig?.shopId || '';
        const deliveryMethod = item.printConfig?.deliveryMethod;
        if (deliveryMethod !== 'pickup') return '';
        return String(shopId).trim();
      })
      .filter(Boolean);

    if (pickupIds.length !== items.length) return null;
    const first = pickupIds[0];
    if (!isLikelyMongoId(first) || !pickupIds.every((id) => id === first)) return null;
    return first;
  }, [items, resolveFlowType]);

  const requiresShippingAddress = !pickupShopIdForOrder;

  useEffect(() => {
    const normalized = upiId.trim().toLowerCase();
    const looksValid = isUpiFormatValid(normalized);
    if (!normalized) {
      if (upiVerifyState !== 'idle') {
        setUpiVerifyState('idle');
        setUpiVerifyMessage('');
      }
      return;
    }
    if (!looksValid && upiVerifyState === 'verified') {
      setUpiVerifyState('idle');
      setUpiVerifyMessage('');
      return;
    }
    if (looksValid && upiVerifyState === 'invalid') {
      setUpiVerifyState('idle');
      setUpiVerifyMessage('');
    }
  }, [upiId, upiVerifyState]);

  const handleVerifyUpi = useCallback(async () => {
    const normalizedUpi = upiId.trim().toLowerCase();
    if (!normalizedUpi) {
      Alert.alert('UPI required', 'Please enter your UPI ID first.');
      return;
    }
    if (!isUpiFormatValid(normalizedUpi)) {
      setUpiVerifyState('invalid');
      setUpiVerifyMessage('Please enter a valid UPI ID format (example: name@bank).');
      return;
    }

    setUpiVerifyState('verifying');
    setUpiVerifyMessage('');
    try {
      const result = await paymentsApi.verifyUpi({ upiId: normalizedUpi });
      if (result?.isValid) {
        setUpiVerifyState('verified');
        setUpiVerifyMessage('UPI ID format looks valid. You can continue to Razorpay payment.');
      } else {
        setUpiVerifyState('invalid');
        setUpiVerifyMessage(result?.reason || 'UPI ID verification failed. Please check and retry.');
      }
    } catch (e: any) {
      setUpiVerifyState('invalid');
      const rawMsg = e?.serverMessage || e?.response?.data?.message || e?.message || 'Could not verify UPI right now.';
      if (String(rawMsg).toLowerCase().includes('upi_regex')) {
        setUpiVerifyMessage('UPI verification service is temporarily unavailable. You can still continue with Razorpay payment.');
      } else {
        setUpiVerifyMessage(rawMsg);
      }
    }
  }, [upiId]);

  const onPay = useCallback(async () => {
    if (items.length === 0) {
      Alert.alert('Cart empty', 'Add items before paying.');
      return;
    }
    if (hasUnavailableItems) {
      Alert.alert('Out of stock', 'One or more cart items are out of stock. Please remove them before payment.');
      return;
    }
    if (requiresShippingAddress && !address) {
      Alert.alert('Address required', 'Please select a delivery address.');
      return;
    }
    if (method === 'wallet' && walletBalance < totalPayable) {
      Alert.alert('Insufficient balance', 'Choose another payment method or top up SpeedWallet.');
      return;
    }
    if (method === 'wallet') {
      setWalletCheckoutUnavailable(true);
      Alert.alert(
        'Wallet checkout unavailable',
        'Wallet balance is connected, but wallet order payment is not supported by the current backend API yet. Please use UPI, card, or net banking for this order.',
      );
      return;
    }
    if (method === 'upi' && !upiId.trim()) {
      Alert.alert('UPI required', 'Please enter your UPI ID.');
      return;
    }
    if (method === 'upi' && !isUpiFormatValid(upiId)) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID format (example: name@bank).');
      return;
    }
    const hasCatalogItemWithoutBackendId = items.some((item) => (
      ['shopping', 'gifting'].includes(resolveFlowType(item))
      && !isLikelyMongoId(item.backendProductId || '')
    ));
    if (hasCatalogItemWithoutBackendId) {
      Alert.alert(
        'Cart needs refresh',
        'One or more cart items are missing backend product id. Please remove and add those items again.',
      );
      return;
    }

    setPaying(true);
    try {
      const canUseFlowSpecificOrderApi =
        !!backendCartId
        && !!address?.id
        && isLikelyMongoId(backendCartId)
        && isLikelyMongoId(address.id)
        && (singleFlowType === 'gifting' || singleFlowType === 'shopping');

      const orderBody = {
        items: items.map((i) => {
          const itemFlowType = resolveFlowType(i);
          const safeBackendProductId = (i.backendProductId || '').trim();
          const isCatalogFlow = itemFlowType === 'shopping' || itemFlowType === 'gifting';
          if (isCatalogFlow && !isLikelyMongoId(safeBackendProductId)) {
            throw new Error(`${itemFlowType} item has no valid backend product id.`);
          }
          return {
            productId: isCatalogFlow
              ? safeBackendProductId
              : (safeBackendProductId || i.id),
            productName: i.name,
            flowType: itemFlowType,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity,
            designId: i.designId,
            printConfigId: i.printConfigId,
            businessPrintConfigId: i.businessPrintConfigId,
            thumbnail: i.image,
          };
        }),
        subtotal: basePrice,
        total: totalPayable,
        shippingAddress: requiresShippingAddress && address ? {
          fullName: address.name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2 || '',
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        } : undefined,
        pickupShopId: pickupShopIdForOrder || undefined,
        deliveryCharge: deliveryFee,
        discount: couponDiscount,
        couponCode: couponCode || undefined,
      };

      let backendOrder: ordersApi.BackendOrder;
      if (canUseFlowSpecificOrderApi && singleFlowType === 'gifting') {
        try {
          backendOrder = await ordersApi.createGiftingOrder({
            cart_id: backendCartId,
            address_id: address.id,
            coupon_code: couponCode || undefined,
          });
        } catch {
          backendOrder = await ordersApi.createOrder(orderBody);
        }
      } else if (canUseFlowSpecificOrderApi && singleFlowType === 'shopping') {
        try {
          backendOrder = await ordersApi.createShoppingOrder({
            cart_id: backendCartId,
            address_id: address.id,
            coupon_code: couponCode || undefined,
          });
        } catch {
          backendOrder = await ordersApi.createOrder(orderBody);
        }
      } else {
        backendOrder = await ordersApi.createOrder(orderBody);
      }

      const paymentResp = await paymentsApi.createPayment({
        orderId: backendOrder._id,
        amount: totalPayable,
        method,
      });

      if (paymentResp.mock || String(paymentResp.keyId || '').startsWith('mock_')) {
        await paymentsApi.verifyPayment({
          razorpayOrderId: paymentResp.razorpayOrderId,
          razorpayPaymentId: paymentResp.razorpayPaymentId || `pay_mock_${Date.now()}`,
          razorpaySignature: paymentResp.razorpaySignature || 'mock_signature_verified',
        });
        addOrder({
          id: backendOrder._id,
          orderNumber: backendOrder.orderNumber,
          status: 'processing',
          items: items.map((i) => ({ ...i })),
          total: totalPayable,
          date: new Date().toISOString().slice(0, 10),
          address: address || {
            id: `pickup-${pickupShopIdForOrder || 'store'}`,
            name: 'Store Pickup',
            phone: '',
            line1: 'Pickup from selected store',
            city: '',
            state: '',
            pincode: '',
            isDefault: false,
          },
          trackingSteps: buildTrackingSteps(),
        });
        addNotification({
          _id: `local-${backendOrder._id}-${Date.now()}`,
          title: 'Order placed',
          message: `Order ${backendOrder.orderNumber || backendOrder._id} confirmed.`,
          type: 'in_app',
          category: 'orders',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        clearCart();
        setPaying(false);
        navigation.navigate('TrackOrder', { orderId: backendOrder._id });
        return;
      }

      if (!paymentResp.keyId || !paymentResp.razorpayOrderId) {
        throw new Error('Payment gateway not configured. Missing Razorpay key or order id.');
      }

      setPendingOrder(backendOrder);
      setRzpOptions({
        keyId: paymentResp.keyId,
        amount: normalizeDisplayAmount(paymentResp.amount, totalPayable),
        currency: paymentResp.currency || 'INR',
        orderId: paymentResp.razorpayOrderId,
        name: 'SpeedCopy',
        description: `Order ${backendOrder.orderNumber || backendOrder._id}`,
        prefill: {
          name: userName || address?.name,
          email: userEmail,
          contact: userPhone || address?.phone,
        },
        theme: { color: '#0F766E' },
      });
    } catch (err: any) {
      const msg = err?.serverMessage || err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
      Alert.alert('Payment Failed', msg);
      setPaying(false);
    }
  }, [addOrder, address, backendCartId, basePrice, clearCart, couponCode, couponDiscount, deliveryFee, hasUnavailableItems, items, method, navigation, normalizeDisplayAmount, pickupShopIdForOrder, requiresShippingAddress, resolveFlowType, singleFlowType, totalPayable, upiId, upiVerifyState, userEmail, userName, userPhone, walletBalance]);

  const finalizeOrder = useCallback((backendOrder: ordersApi.BackendOrder) => {
    const orderAddress = address || {
      id: `pickup-${pickupShopIdForOrder || 'store'}`,
      name: 'Store Pickup',
      phone: '',
      line1: 'Pickup from selected store',
      city: '',
      state: '',
      pincode: '',
      isDefault: false,
    };
    const localOrder: Order = {
      id: backendOrder._id,
      orderNumber: backendOrder.orderNumber,
      status: 'processing',
      items: items.map((i) => ({ ...i })),
      total: totalPayable,
      date: new Date().toISOString().slice(0, 10),
      address: orderAddress,
      trackingSteps: buildTrackingSteps(),
    };
    addOrder(localOrder);
    addNotification({
      _id: `local-${backendOrder._id}-${Date.now()}`,
      title: 'Order placed',
      message: `Order ${backendOrder.orderNumber || backendOrder._id} confirmed.`,
      type: 'in_app',
      category: 'orders',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    clearCart();
    setPaying(false);
    navigation.navigate('TrackOrder', { orderId: backendOrder._id });
  }, [addOrder, address, clearCart, items, navigation, pickupShopIdForOrder, totalPayable]);

  const onRazorpaySuccess = useCallback(async (r: RazorpaySuccess) => {
    try {
      await paymentsApi.verifyPayment({
        razorpayOrderId: r.razorpay_order_id,
        razorpayPaymentId: r.razorpay_payment_id,
        razorpaySignature: r.razorpay_signature,
      });
      const order = pendingOrder;
      setRzpOptions(null);
      setPendingOrder(null);
      if (order) finalizeOrder(order);
    } catch (e: any) {
      setRzpOptions(null);
      setPendingOrder(null);
      setPaying(false);
      Alert.alert('Payment verification failed', e?.message || 'We could not verify your payment. Please contact support.');
    }
  }, [finalizeOrder, pendingOrder]);

  const onRazorpayDismiss = useCallback((reason?: string) => {
    setRzpOptions(null);
    setPendingOrder(null);
    setPaying(false);
    if (reason && reason !== 'user_cancelled' && reason !== 'dismissed' && reason !== 'closed' && reason !== 'back_button') {
      Alert.alert('Payment cancelled', reason);
    }
  }, []);

  const RadioCircle = ({ selected }: { selected: boolean }) => (
    <View
      style={[
        styles.radioOuter,
        { borderColor: selected ? '#0F766E' : t.border },
        selected && styles.radioOuterSelected,
      ]}
    >
      {selected && <View style={styles.radioInner} />}
    </View>
  );

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Payment</Text>
        <View style={styles.headerSlot} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {hasUnavailableItems ? (
          <View style={styles.stockAlert}>
            <Text style={styles.stockAlertTitle}>Some items are out of stock</Text>
            <Text style={styles.stockAlertText}>Please go back to cart and remove unavailable items before paying.</Text>
          </View>
        ) : null}

        {/* Payment Method Heading */}
        <Text style={[styles.mainTitle, { color: t.textPrimary }]}>Payment Method</Text>
        <Text style={[styles.mainSub, { color: t.textSecondary }]}>Select how you'd like to pay for your order.</Text>

        {/* Credit / Debit Card */}
        <TouchableOpacity
          style={[styles.methodCard, shadow(), { backgroundColor: t.card }, method === 'card' && styles.methodCardActive, method === 'card' && { backgroundColor: themeMode === 'dark' ? '#0F766E15' : '#F9FFFE' }]}
          onPress={() => setMethod('card')}
          activeOpacity={0.9}
        >
          <View style={[styles.methodIconWrap, { backgroundColor: t.chipBg }]}>
            <CreditCard size={18} color={t.iconDefault} />
          </View>
          <View style={styles.methodBody}>
            <Text style={[styles.methodTitle, { color: t.textPrimary }]}>Credit / Debit Card</Text>
            <Text style={[styles.methodSub, { color: t.placeholder }]}>Visa, Mastercard, RuPay</Text>
          </View>
          <RadioCircle selected={method === 'card'} />
        </TouchableOpacity>

        {/* UPI Options */}
        <TouchableOpacity
          style={[styles.methodCard, shadow(), { backgroundColor: t.card }, method === 'upi' && styles.methodCardActive, method === 'upi' && { backgroundColor: themeMode === 'dark' ? '#0F766E15' : '#F9FFFE' }]}
          onPress={() => setMethod('upi')}
          activeOpacity={0.9}
        >
          <View style={[styles.methodIconWrap, { backgroundColor: t.chipBg }]}>
            <Smartphone size={18} color={t.iconDefault} />
          </View>
          <View style={styles.methodBody}>
            <Text style={[styles.methodTitle, { color: t.textPrimary }]}>UPI Options</Text>
            <Text style={[styles.methodSub, { color: t.placeholder }]}>Pay directly from your bank account</Text>
          </View>
          <RadioCircle selected={method === 'upi'} />
        </TouchableOpacity>

        {/* UPI Expanded */}
        {method === 'upi' && (
          <View style={[styles.upiExpanded, shadow(), { backgroundColor: t.card, borderColor: themeMode === 'dark' ? t.border : '#E8F5E9' }]}>
            <View style={styles.upiAppRow}>
              <View style={[styles.upiAppPill, { backgroundColor: t.chipBg }]}>
                <View style={[styles.upiAppDot, { backgroundColor: '#4285F4' }]} />
                <Text style={[styles.upiAppLabel, { color: t.textPrimary }]}>Google Pay</Text>
              </View>
              <View style={[styles.upiAppPill, styles.upiPhonePe]}>
                <Text style={styles.upiAppLabelPe}>Pe</Text>
                <Text style={[styles.upiAppLabel, { color: t.textPrimary }]}>PhonePe</Text>
              </View>
            </View>

            <View style={styles.orDivider}>
              <View style={[styles.orLine, { backgroundColor: t.divider }]} />
              <Text style={[styles.orText, { color: t.placeholder }]}>OR ENTER ID</Text>
              <View style={[styles.orLine, { backgroundColor: t.divider }]} />
            </View>

            <Text style={[styles.upiFieldLabel, { color: t.textSecondary }]}>UPI ID</Text>
            <View style={[styles.upiInputRow, { borderColor: t.border, backgroundColor: t.inputBg }]}>
              <TextInput
                style={[styles.upiInput, { color: t.textPrimary }]}
                placeholder="username@upi"
                placeholderTextColor={t.placeholder}
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={handleVerifyUpi} disabled={upiVerifyState === 'verifying'}>
                <Text style={[styles.verifyLink, upiVerifyState === 'verifying' && { opacity: 0.7 }]}>
                  {upiVerifyState === 'verifying' ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>
            {!!upiVerifyMessage && (
              <Text
                style={[
                  styles.upiStatusText,
                  { color: upiVerifyState === 'verified' ? '#0F766E' : '#B91C1C' },
                ]}
              >
                {upiVerifyMessage}
              </Text>
            )}
            <Text style={[styles.upiSecureNote, { color: t.placeholder }]}>Your UPI ID will be encrypted and secure.</Text>

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setCheckMobile(!checkMobile)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: t.border },
                  checkMobile && styles.checkboxChecked,
                ]}
              >
                {checkMobile && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={[styles.checkLabel, { color: t.textSecondary }]} numberOfLines={1}>
                Complete the payment request on your banking app
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SpeedWallet */}
        <TouchableOpacity
          style={[styles.methodCard, shadow(), { backgroundColor: t.card }, method === 'wallet' && styles.methodCardActive, method === 'wallet' && { backgroundColor: themeMode === 'dark' ? '#0F766E15' : '#F9FFFE' }]}
          onPress={() => setMethod('wallet')}
          activeOpacity={0.9}
        >
          <View style={[styles.methodIconWrap, { backgroundColor: t.chipBg }]}>
            <Wallet size={18} color={t.iconDefault} />
          </View>
          <View style={styles.methodBody}>
            <Text style={[styles.methodTitle, { color: t.textPrimary }]}>SpeedCopy Wallet</Text>
            <Text style={[styles.methodSub, { color: t.placeholder }]}>
              {walletCheckoutUnavailable
                ? `Available Balance: ${formatCurrency(walletBalance)}. Checkout payment not available yet.`
                : `Available Balance: ${formatCurrency(walletBalance)}`}
            </Text>
          </View>
          <RadioCircle selected={method === 'wallet'} />
        </TouchableOpacity>

        {/* Net Banking */}
        <TouchableOpacity
          style={[styles.methodCard, shadow(), { backgroundColor: t.card }, method === 'netbanking' && styles.methodCardActive, method === 'netbanking' && { backgroundColor: themeMode === 'dark' ? '#0F766E15' : '#F9FFFE' }]}
          onPress={() => setMethod('netbanking')}
          activeOpacity={0.9}
        >
          <View style={[styles.methodIconWrap, { backgroundColor: t.chipBg }]}>
            <Building2 size={18} color={t.iconDefault} />
          </View>
          <View style={styles.methodBody}>
            <Text style={[styles.methodTitle, { color: t.textPrimary }]}>Net Banking</Text>
            <Text style={[styles.methodSub, { color: t.placeholder }]}>View all banks</Text>
          </View>
          <RadioCircle selected={method === 'netbanking'} />
        </TouchableOpacity>

        {/* Order Summary */}
        <View style={[styles.summaryCard, shadow(3), { backgroundColor: t.card }]}>
          <Text style={[styles.summaryTitle, { color: t.textPrimary }]}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>Total Price</Text>
            <Text style={[styles.summaryValue, { color: t.textPrimary }]}>{formatCurrency(basePrice)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, { color: t.textPrimary }]}>{formatCurrency(deliveryFee)}</Text>
          </View>
          {couponDiscount > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.couponLeft}>
                <Tag size={14} color="#0F766E" />
                <Text style={styles.couponText}>Coupon{couponCode ? ` (${couponCode})` : ''}</Text>
              </View>
              <Text style={styles.couponValue}>-{formatCurrency(couponDiscount)}</Text>
            </View>
          )}

          <View style={[styles.summaryDivider, { backgroundColor: t.divider }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTotalLabel, { color: t.textPrimary }]}>Total Payable</Text>
            <View style={styles.totalRight}>
              <Text style={[styles.summaryTotalStrike, { color: t.placeholder }]}>{formatCurrency(originalTotal)}</Text>
              <Text style={[styles.summaryTotalValue, { color: t.textPrimary }]}>{formatCurrency(totalPayable)}</Text>
            </View>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payBtn, (paying || hasUnavailableItems) && { opacity: 0.75 }]}
          onPress={onPay}
          activeOpacity={0.9}
          disabled={paying || hasUnavailableItems}
        >
          {paying ? (
            <ActivityIndicator color={t.background} />
          ) : (
            <>
              <Lock size={16} color={t.background} style={{ marginRight: 8 }} />
              <Text style={[styles.payBtnText, { color: t.background }]}>Pay {formatCurrency(totalPayable)} Securely</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Guarantee text */}
        <Text style={[styles.guaranteeText, { color: t.placeholder }]}>GUARANTEED SAFE CHECKOUT</Text>

        {/* Trust badges */}
        <View style={styles.badgeRow}>
          {['SSL SECURED', 'PCI COMPLIANT', '256-BIT'].map((badge) => (
            <View key={badge} style={[styles.badgePill, { backgroundColor: t.chipBg }]}>
              <Shield size={10} color={t.textSecondary} />
              <Text style={[styles.badgeText, { color: t.textSecondary }]}>{badge}</Text>
            </View>
          ))}
        </View>

        {/* Free cancellation */}
        <View style={[styles.cancelCard, shadow(), { backgroundColor: t.card }]}>
          <View style={styles.cancelIconWrap}>
            <Shield size={18} color="#0F766E" />
          </View>
          <View style={styles.cancelBody}>
            <Text style={[styles.cancelTitle, { color: t.textPrimary }]}>Free cancellation policy</Text>
            <Text style={[styles.cancelSub, { color: t.textSecondary }]}>
              You can cancel your order within 10 minutes of placing it for a full refund.
            </Text>
          </View>
        </View>
      </ScrollView>

      <RazorpayCheckout
        visible={!!rzpOptions}
        options={rzpOptions}
        onSuccess={onRazorpaySuccess}
        onDismiss={onRazorpayDismiss}
      />
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
    width: 40,
    minHeight: 40,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: '#242424',
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    paddingTop: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  stockAlert: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 16,
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
  mainTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: '#000',
    marginTop: 4,
  },
  mainSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#6B6B6B',
    marginBottom: 20,
    marginTop: 4,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  methodCardActive: {
    borderColor: '#0F766E',
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodBody: {
    flex: 1,
  },
  methodTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#242424',
  },
  methodSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#A5A5A5',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#0F766E',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0F766E',
  },
  upiExpanded: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    marginTop: -4,
    borderWidth: 1,
  },
  upiAppRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  upiAppPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  upiPhonePe: {
    backgroundColor: '#F3EAFF',
  },
  upiAppDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  upiAppLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#242424',
  },
  upiAppLabelPe: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
    color: '#5F259F',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8E8',
  },
  orText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: '#A5A5A5',
    letterSpacing: 1,
  },
  upiFieldLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#6B6B6B',
    marginBottom: 6,
  },
  upiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 6,
  },
  upiInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#242424',
  },
  verifyLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  upiSecureNote: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#A5A5A5',
    marginBottom: 12,
  },
  upiStatusText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    marginBottom: 6,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B6B6B',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#000',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#6B6B6B',
  },
  summaryValue: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#242424',
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  couponText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#0F766E',
  },
  couponValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#0F766E',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 10,
  },
  summaryTotalLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: '#000',
  },
  totalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  summaryTotalStrike: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#A5A5A5',
    textDecorationLine: 'line-through',
  },
  summaryTotalValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#000',
  },
  payBtn: {
    flexDirection: 'row',
    backgroundColor: '#0F766E',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  payBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  guaranteeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: '#A5A5A5',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 9,
    color: '#6B6B6B',
    letterSpacing: 0.5,
  },
  cancelCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  cancelIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBody: {
    flex: 1,
  },
  cancelTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#242424',
  },
  cancelSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 2,
    lineHeight: 16,
  },
});

