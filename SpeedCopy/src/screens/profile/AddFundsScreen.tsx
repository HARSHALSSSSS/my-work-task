import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, ArrowRight, Check, CreditCard, Wallet as WalletIcon, Building2, Smartphone } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useThemeStore } from '../../store/useThemeStore';
import { useOrderStore } from '../../store/useOrderStore';
import { WalletStackParamList } from '../../navigation/types';
import * as financeApi from '../../api/finance';
import { RazorpayCheckout, RazorpayOptions, RazorpaySuccess } from '../../components/payment/RazorpayCheckout';

const DEFAULT_QUICK_AMOUNTS = [100, 200, 500, 1000];
const NAV_OVERLAY_CLEARANCE = 108;
type Nav = NativeStackNavigationProp<WalletStackParamList, 'AddFunds'>;
type PaymentChannelId = 'upi' | 'card' | 'wallet' | 'netbanking' | 'bank';
type PaymentChannel = { id: PaymentChannelId; label: string; method: string };

const CHANNEL_ORDER: PaymentChannelId[] = ['upi', 'card', 'wallet', 'netbanking', 'bank'];
const CHANNEL_META: Record<PaymentChannelId, { label: string; method: string; subtitle: string }> = {
  upi: { label: 'UPI', method: 'upi', subtitle: 'PhonePe, GPay, Paytm and others' },
  card: { label: 'Cards', method: 'card', subtitle: 'Credit / Debit cards' },
  wallet: { label: 'Wallet', method: 'wallet', subtitle: 'Digital wallet payments' },
  netbanking: { label: 'Net Banking', method: 'netbanking', subtitle: 'Pay via bank account login' },
  bank: { label: 'Bank Transfer', method: 'bank_transfer', subtitle: 'Direct transfer from bank' },
};

function normalizePaymentChannels(raw: any): PaymentChannel[] {
  const detected = new Set<PaymentChannelId>();
  const addChannel = (id: PaymentChannelId) => detected.add(id);

  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      const parts = [
        typeof item === 'string' ? item : '',
        typeof item?.type === 'string' ? item.type : '',
        typeof item?.id === 'string' ? item.id : '',
        typeof item?.name === 'string' ? item.name : '',
      ];
      const joined = parts.join(' ').toLowerCase();
      const tokens = joined.split(/[^a-z0-9]+/).filter(Boolean);

      if (joined.includes('upi') || tokens.includes('upi')) addChannel('upi');
      if (joined.includes('card') || tokens.includes('card') || tokens.includes('cards')) addChannel('card');
      if (joined.includes('wallet') || tokens.includes('wallet')) addChannel('wallet');
      if (joined.includes('netbank') || tokens.includes('netbanking')) addChannel('netbanking');
      if (joined.includes('bank') || tokens.includes('bank') || tokens.includes('bankaccount')) addChannel('bank');
    });
  }

  // Keep real-app UX stable even when backend sends generic provider names.
  if (detected.size === 0) {
    addChannel('upi');
    addChannel('card');
    addChannel('wallet');
  }

  return CHANNEL_ORDER
    .filter((id) => detected.has(id))
    .map((id) => ({ id, label: CHANNEL_META[id].label, method: CHANNEL_META[id].method }));
}

function MethodLogoStrip({ channel }: { channel: PaymentChannelId }) {
  if (channel === 'upi') {
    return (
      <View style={styles.logoStrip}>
        <View style={[styles.logoPill, { backgroundColor: '#EAF3FF' }]}>
          <Text style={[styles.logoText, { color: '#2A64F6' }]}>GPay</Text>
        </View>
        <View style={[styles.logoPill, { backgroundColor: '#F3EAFF' }]}>
          <Text style={[styles.logoText, { color: '#5F259F' }]}>PhonePe</Text>
        </View>
        <View style={[styles.logoPill, { backgroundColor: '#E6F7FF' }]}>
          <Text style={[styles.logoText, { color: '#00AEEF' }]}>Paytm</Text>
        </View>
      </View>
    );
  }

  if (channel === 'card') {
    return (
      <View style={styles.logoStrip}>
        <View style={[styles.logoPill, { backgroundColor: '#1A1F71' }]}>
          <Text style={[styles.logoText, { color: '#FFFFFF' }]}>VISA</Text>
        </View>
        <View style={[styles.logoPill, { backgroundColor: '#F59E0B' }]}>
          <Text style={[styles.logoText, { color: '#111827' }]}>MC</Text>
        </View>
        <View style={[styles.logoPill, { backgroundColor: '#22C55E' }]}>
          <Text style={[styles.logoText, { color: '#06220E' }]}>RuPay</Text>
        </View>
      </View>
    );
  }

  if (channel === 'wallet') {
    return (
      <View style={styles.logoIconPill}>
        <WalletIcon size={16} color="#0F766E" />
      </View>
    );
  }

  if (channel === 'netbanking') {
    return (
      <View style={styles.logoIconPill}>
        <Building2 size={16} color="#1D4ED8" />
      </View>
    );
  }

  return (
    <View style={styles.logoIconPill}>
      <Smartphone size={16} color="#374151" />
    </View>
  );
}

export const AddFundsScreen: React.FC = () => {
  const { colors: t, mode: themeMode } = useThemeStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const fetchWallet = useOrderStore((s) => s.fetchWallet);
  const [amount, setAmount] = useState('');
  const [quickAmounts, setQuickAmounts] = useState(DEFAULT_QUICK_AMOUNTS);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rzpOptions, setRzpOptions] = useState<RazorpayOptions | null>(null);
  const [pendingTopup, setPendingTopup] = useState<{ amount: number } | null>(null);

  useEffect(() => {
    financeApi.getTopupConfig()
      .then((cfg) => {
        const presets = cfg?.topup_presets || cfg?.presets;
        if (presets?.length) setQuickAmounts(presets);
        const channels = normalizePaymentChannels(cfg?.payment_methods || cfg?.paymentMethods);
        setPaymentChannels(channels);
        if (channels.length > 0) setSelectedMethodId(channels[0].id);
      })
      .catch(() => {});
  }, []);

  const handleQuickAdd = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toFixed(2));
  };

  const normalizeDisplayAmount = (backendAmount: number | undefined, fallbackRupees: number) => {
    if (!backendAmount || !Number.isFinite(backendAmount)) return fallbackRupees;
    return backendAmount > fallbackRupees * 10 ? backendAmount / 100 : backendAmount;
  };

  const confirmWalletTopup = useCallback(
    async (payload: {
      amount: number;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature?: string;
    }) => {
      const topup = await financeApi.confirmTopup(payload);
      await fetchWallet().catch(() => {});
      Alert.alert(
        topup.alreadyCredited ? 'Already Added' : 'Success',
        topup.alreadyCredited
          ? 'This top-up was already credited to your wallet.'
          : `\u20B9${payload.amount.toFixed(2)} added to your wallet.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    },
    [fetchWallet, navigation],
  );

  const handleConfirm = useCallback(async () => {
    const num = parseFloat(amount);
    if (!num || num < 10) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const preview = await financeApi.topupPreview(num);
      const payResp = await financeApi.initiateTopup({
        orderId: `wallet_topup_${Date.now()}`,
        amount: preview.total_payable,
        currency: preview.currency || 'INR',
      });

      // Dev fallback when finance/payment services run in mock mode.
      if (payResp.mock) {
        await confirmWalletTopup({
          amount: preview.amount,
          razorpayOrderId: payResp.razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'mock_signature_verified',
        });
        setSubmitting(false);
        return;
      }

      if (!payResp.keyId || !payResp.razorpayOrderId) {
        throw new Error('Payment gateway not configured for top-up.');
      }

      setPendingTopup({ amount: preview.amount });
      setRzpOptions({
        keyId: payResp.keyId,
        amount: normalizeDisplayAmount(payResp.amount, preview.total_payable),
        currency: payResp.currency || preview.currency || 'INR',
        orderId: payResp.razorpayOrderId,
        name: 'SpeedCopy Wallet',
        description: `Wallet top-up \u20B9${preview.amount}`,
        theme: { color: '#4CA1AF' },
      });
    } catch {
      setSubmitting(false);
      Alert.alert('Error', 'Failed to process top-up. Please try again.');
    }
  }, [amount, confirmWalletTopup, paymentChannels, selectedMethodId, submitting]);

  const onRazorpaySuccess = useCallback(async (resp: RazorpaySuccess) => {
    try {
      await confirmWalletTopup({
        amount: pendingTopup?.amount || 0,
        razorpayOrderId: resp.razorpay_order_id,
        razorpayPaymentId: resp.razorpay_payment_id,
        razorpaySignature: resp.razorpay_signature,
      });
    } catch (e: any) {
      Alert.alert('Top-up Failed', e?.message || 'Could not confirm wallet top-up.');
    } finally {
      setRzpOptions(null);
      setPendingTopup(null);
      setSubmitting(false);
    }
  }, [confirmWalletTopup, pendingTopup?.amount]);

  const onRazorpayDismiss = useCallback((reason?: string) => {
    setRzpOptions(null);
    setPendingTopup(null);
    setSubmitting(false);
    if (reason && !['dismissed', 'user_cancelled', 'closed', 'back_button'].includes(reason)) {
      Alert.alert('Payment Cancelled', reason);
    }
  }, []);

  const footerBottomPadding = Math.max(12, insets.bottom + NAV_OVERLAY_CLEARANCE);

  return (
    <SafeScreen>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Add Funds</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>ENTER AMOUNT</Text>
        <View style={[styles.amountCard, { backgroundColor: t.card }]}>
          <Text style={[styles.currencySymbol, { color: t.textPrimary }]}>{'\u20B9'}</Text>
          <TextInput
            style={[styles.amountInput, { color: t.textPrimary }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            selectTextOnFocus
            placeholder="0.00"
            placeholderTextColor={t.placeholder}
          />
        </View>

        <View style={styles.quickRow}>
          {quickAmounts.map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.quickBtn, { borderColor: t.border }]}
              onPress={() => handleQuickAdd(val)}
              activeOpacity={0.8}
            >
              <Text style={[styles.quickBtnText, { color: '#2F80ED' }]}>{`+\u20B9${val}`}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.methodsHeader}>
          <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>PAYMENT METHODS</Text>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.changeLink}>MANAGE</Text>
          </TouchableOpacity>
        </View>

        {paymentChannels.length === 0 ? (
          <View style={styles.addMethodRow}>
            <View style={[styles.plusWrap, { borderColor: t.border }]}>
              <Plus size={16} color={t.textSecondary} />
            </View>
            <Text style={[styles.addMethodText, { color: t.textSecondary }]}>
              No payment methods configured by backend yet
            </Text>
          </View>
        ) : (
          paymentChannels.map((method) => {
            const selected = selectedMethodId === method.id;
            const subtitle = CHANNEL_META[method.id].subtitle;
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.cardRow,
                  { backgroundColor: t.card, borderColor: selected ? '#7AB1F1' : t.border },
                ]}
                activeOpacity={0.85}
                onPress={() => setSelectedMethodId(method.id)}
              >
                <View style={[styles.channelIconWrap, selected && { backgroundColor: '#EAF7FF' }]}>
                  {method.id === 'card' && <CreditCard size={18} color={selected ? '#0F766E' : '#1F2937'} />}
                  {method.id === 'upi' && <Smartphone size={18} color={selected ? '#0F766E' : '#1F2937'} />}
                  {method.id === 'wallet' && <WalletIcon size={18} color={selected ? '#0F766E' : '#1F2937'} />}
                  {method.id === 'netbanking' && <Building2 size={18} color={selected ? '#0F766E' : '#1F2937'} />}
                  {method.id === 'bank' && <Building2 size={18} color={selected ? '#0F766E' : '#1F2937'} />}
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardNumber, { color: t.textPrimary }]} numberOfLines={1}>{method.label}</Text>
                  <Text style={[styles.cardExpiry, { color: t.textSecondary }]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                  <MethodLogoStrip channel={method.id} />
                </View>
                {selected && <Check size={18} color="#7AB1F1" />}
              </TouchableOpacity>
            );
          })
        )}

        <View style={[styles.speedPayCard, { backgroundColor: themeMode === 'dark' ? t.card : '#99D7F0' }]}>
          <View style={styles.speedPayBadge}>
            <Text style={styles.speedPayBadgeText}>SPEEDCOPY TIP</Text>
          </View>
          <Text style={[styles.speedPayTitle, { color: '#0F172A' }]}>Faster top-ups with{'\n'}Instant Pay</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.confirmText}>CONFIRM & ADD FUNDS</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
      <RazorpayCheckout
        visible={!!rzpOptions}
        options={rzpOptions}
        onSuccess={onRazorpaySuccess}
        onDismiss={onRazorpayDismiss}
      />
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  headerBar: {
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
    lineHeight: 36,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 16,
  },
  sectionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 20,
    gap: 4,
  },
  currencySymbol: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
  },
  amountInput: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    minWidth: 80,
    textAlign: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  methodsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#7AB1F1',
    letterSpacing: 0.5,
    textDecorationLine: 'underline',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  channelIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    gap: 2,
    flex: 1,
  },
  cardNumber: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    flexShrink: 1,
  },
  cardExpiry: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    flexShrink: 1,
  },
  logoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  logoPill: {
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  logoText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9.5,
  },
  logoIconPill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EEF2F7',
  },
  addMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#B8C7BC',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  plusWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMethodText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  speedPayCard: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  speedPayBadge: {
    backgroundColor: '#2F80ED',
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  speedPayBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  speedPayTitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  confirmBtn: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

