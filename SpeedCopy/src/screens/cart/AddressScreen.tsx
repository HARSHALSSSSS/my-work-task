import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Building2, ChevronLeft, Home, Truck } from 'lucide-react-native';
import { Colors, Radii, Spacing } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CartStackParamList } from '../../navigation/types';
import { useCartStore } from '../../store/useCartStore';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Address } from '../../types';

type Nav = NativeStackNavigationProp<CartStackParamList, 'Address'>;
type Route = RouteProp<CartStackParamList, 'Address'>;

function cardShadow() {
  return Platform.select({
    ios: {
      shadowColor: Colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  });
}

export function AddressScreen() {
  const { colors: t, mode: themeMode } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const couponCode = route.params?.couponCode;
  const couponDiscount = route.params?.couponDiscount ?? 0;
  const cartItems = useCartStore((s) => s.items);
  const addresses = useOrderStore((s) => s.addresses);
  const setDefaultAddress = useOrderStore((s) => s.setDefaultAddress);
  const fetchAddresses = useOrderStore((s) => s.fetchAddresses);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const initialId = useMemo(() => {
    const def = addresses.find((a) => a.isDefault);
    return def?.id ?? addresses[0]?.id ?? '';
  }, [addresses]);

  const [selectedId, setSelectedId] = useState(initialId);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  useEffect(() => {
    setSelectedId(initialId);
  }, [initialId]);

  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setLine1('');
    setLine2('');
    setCity('');
    setStateName('');
    setPincode('');
  }, []);

  const saveAddressToBackend = useOrderStore((s) => s.saveAddressToBackend);

  const handleAddAddress = useCallback(async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanLine1 = line1.trim();
    const cleanLine2 = line2.trim();
    const cleanCity = city.trim();
    const cleanState = stateName.trim();
    const cleanPincode = pincode.replace(/\D/g, '');

    if (!cleanName || !cleanPhone || !cleanLine1 || !cleanCity || !cleanState || !cleanPincode) {
      Alert.alert('Missing fields', 'Please fill all required address fields.');
      return;
    }
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (cleanPincode.length < 6) {
      Alert.alert('Invalid pincode', 'Please enter a valid 6-digit pincode.');
      return;
    }

    const addrData = {
      label: 'Home' as const,
      fullName: cleanName,
      phone: cleanPhone,
      line1: cleanLine1,
      line2: cleanLine2 || undefined,
      city: cleanCity,
      state: cleanState,
      pincode: cleanPincode,
      isDefault: addresses.length === 0,
    };
    await saveAddressToBackend(addrData);
    const newAddresses = useOrderStore.getState().addresses;
    const lastAddr = newAddresses[newAddresses.length - 1];
    if (lastAddr) {
      setSelectedId(lastAddr.id);
      if (newAddresses.length === 1) setDefaultAddress(lastAddr.id);
    }
    resetForm();
    setShowForm(false);
  }, [saveAddressToBackend, addresses.length, city, line1, line2, name, phone, pincode, resetForm, setDefaultAddress, stateName]);

  const onContinue = useCallback(() => {
    if (cartItems.length === 0) {
      Alert.alert('Cart empty', 'Add items to your cart before payment.');
      return;
    }
    const id = selectedId || addresses[0]?.id;
    if (!id) {
      Alert.alert('Add an address', 'Save a delivery address to continue.');
      return;
    }
    navigation.navigate('PaymentSummary', {
      addressId: id,
      couponCode,
      couponDiscount,
    });
  }, [addresses, cartItems.length, couponCode, couponDiscount, navigation, selectedId]);

  const rows = useMemo(
    () =>
      addresses.map((addr) => ({
        addr,
        kind: (addr.label?.toLowerCase() === 'office' ? 'office' : 'home') as 'home' | 'office',
      })),
    [addresses],
  );

  return (
    <SafeScreen>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={26} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: t.textPrimary }]} numberOfLines={1}>
          Address & delivery
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.noticeBox, { backgroundColor: themeMode === 'dark' ? t.card : Colors.blueLightBg, borderColor: themeMode === 'dark' ? t.border : 'rgba(114, 146, 255, 0.25)' }]}>
            <View style={[styles.noticeIconWrap, { backgroundColor: t.card }]}>
              <Truck size={22} color={Colors.blueAccent} />
            </View>
            <View style={styles.noticeTextWrap}>
              <Text style={[styles.noticeTitle, { color: t.textPrimary }]}>Estimated delivery</Text>
              <Text style={[styles.noticeSubtitle, { color: t.textSecondary }]}>Within 24 Hours</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Saved Addresses</Text>
            <Text style={[styles.sectionCount, { color: t.textSecondary }]}>
              {addresses.length} saved
            </Text>
          </View>

          {rows.map(({ addr, kind }) => {
            const selected = selectedId === addr.id;
            return (
              <TouchableOpacity
                key={addr.id}
                style={[
                  styles.card,
                  cardShadow(),
                  { backgroundColor: t.card },
                  selected && styles.cardSelected,
                ]}
                onPress={() => setSelectedId(addr.id)}
                activeOpacity={0.92}
              >
                <View style={styles.radioOuter}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>

                <View style={styles.iconBadge}>
                  {kind === 'home' ? (
                    <Home size={16} color={Colors.surface} />
                  ) : (
                    <Building2 size={16} color={Colors.surface} />
                  )}
                </View>

                <View style={styles.cardBody}>
                  <Text style={[styles.cardKindLabel, { color: t.textPrimary }]}>
                    {kind === 'home' ? 'Home' : 'Office'}
                  </Text>
                  <Text style={[styles.cardLine, { color: t.textPrimary }]} numberOfLines={2}>
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ''}
                  </Text>
                  <Text style={[styles.cardLineMuted, { color: t.textSecondary }]} numberOfLines={1}>
                    {addr.city}, {addr.state}
                  </Text>
                  <Text style={[styles.pinLine, { color: t.textMuted }]}>Pin: {addr.pincode}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => setShowForm((v) => !v)}
            style={styles.addLinkWrap}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Text style={styles.addLink}>Add New Address</Text>
          </TouchableOpacity>

          {showForm && (
            <View style={styles.form}>
              <Input label="Name" value={name} onChangeText={setName} placeholder="Full name" />
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
              />
              <Input label="Address Line 1" value={line1} onChangeText={setLine1} placeholder="House, street" />
              <Input label="Line 2" value={line2} onChangeText={setLine2} placeholder="Landmark (optional)" />
              <Input label="City" value={city} onChangeText={setCity} />
              <Input label="State" value={stateName} onChangeText={setStateName} />
              <Input label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" />
              <Button title="Save Address" onPress={handleAddAddress} variant="primary" size="md" />
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: t.divider, backgroundColor: t.background }]}>
          <Button title="Deliver Here" onPress={onContinue} variant="primary" size="lg" />
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 6,
    paddingBottom: 12,
  },
  topBarSpacer: {
    width: 26,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textDark,
  },
  scroll: {
    paddingTop: 8,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.blueLightBg,
    borderRadius: Radii.section,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(114, 146, 255, 0.25)',
  },
  noticeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  noticeTextWrap: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textDark,
  },
  noticeSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textDark,
  },
  sectionCount: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radii.section,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: Spacing.md,
  },
  cardSelected: {
    borderColor: Colors.blueAccent,
    backgroundColor: Colors.blueLightBg,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.blueAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.blueAccent,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.blueAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardKindLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textDark,
  },
  cardLine: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textDark,
  },
  cardLineMuted: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  pinLine: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addLinkWrap: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  addLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.blueAccent,
  },
  form: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderGray,
    backgroundColor: Colors.background,
  },
});

