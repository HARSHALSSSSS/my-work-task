import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Home,
  Building2,
  MapPin,
  Trash2,
  CheckCircle2,
  Plus,
} from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Input } from '../../components/ui/Input';
import { useOrderStore } from '../../store/useOrderStore';
import { useThemeStore } from '../../store/useThemeStore';
import { ProfileStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'SavedAddress'>;

function cardShadow() {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  });
}

export function SavedAddressScreen() {
  const navigation = useNavigation<Nav>();
  const { colors: t } = useThemeStore();
  const addresses = useOrderStore((s) => s.addresses);
  const addAddress = useOrderStore((s) => s.addAddress);
  const removeAddress = useOrderStore((s) => s.removeAddress);
  const setDefaultAddress = useOrderStore((s) => s.setDefaultAddress);
  const fetchAddresses = useOrderStore((s) => s.fetchAddresses);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const resetForm = () => {
    setName('');
    setPhone('');
    setLine1('');
    setLine2('');
    setCity('');
    setState('');
    setPincode('');
    setShowForm(false);
  };

  const saveAddressToBackend = useOrderStore((s) => s.saveAddressToBackend);

  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanLine1 = line1.trim();
    const cleanLine2 = line2.trim();
    const cleanCity = city.trim();
    const cleanState = state.trim();
    const cleanPincode = pincode.replace(/\D/g, '');

    if (!cleanName || !cleanPhone || !cleanLine1 || !cleanCity || !cleanState || !cleanPincode) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
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

    await saveAddressToBackend({
      label: 'Home',
      fullName: cleanName,
      phone: cleanPhone,
      line1: cleanLine1,
      line2: cleanLine2,
      city: cleanCity,
      state: cleanState,
      pincode: cleanPincode,
      isDefault: addresses.length === 0,
    });
    resetForm();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeAddress(id) },
    ]);
  };

  const getAddressIcon = (index: number) => {
    return index === 0 ? Home : Building2;
  };

  return (
    <SafeScreen>
      <View style={[styles.header, { backgroundColor: t.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Saved Address</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {addresses.length === 0 && !showForm && (
          <View style={[styles.emptyCard, cardShadow(), { backgroundColor: t.card }]}>
            <MapPin size={48} color={t.placeholder} />
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No saved addresses</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>
              Add an address for faster checkout
            </Text>
          </View>
        )}

        {addresses.map((addr, idx) => {
          const Icon = getAddressIcon(idx);
          return (
            <View key={addr.id} style={[styles.addressCard, cardShadow(), { backgroundColor: t.card }]}>
              <View style={styles.cardRow}>
                <View style={[styles.iconCircle, { backgroundColor: addr.isDefault ? 'rgba(76, 161, 175, 0.15)' : t.chipBg }]}>
                  <Icon size={20} color={addr.isDefault ? '#4CA1AF' : t.iconDefault} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.addrName, { color: t.textPrimary }]}>{addr.name}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.addrLine, { color: t.textSecondary }]}>
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                  </Text>
                  <Text style={[styles.addrLine, { color: t.textSecondary }]}>
                    {addr.city}, {addr.state} â€” {addr.pincode}
                  </Text>
                  <Text style={[styles.addrPhone, { color: t.textMuted }]}>{addr.phone}</Text>
                </View>
              </View>

              <View style={[styles.cardActions, { borderTopColor: t.divider }]}>
                {!addr.isDefault && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setDefaultAddress(addr.id)}
                    activeOpacity={0.7}
                  >
                    <CheckCircle2 size={16} color="#4CA1AF" />
                    <Text style={[styles.actionText, { color: '#4CA1AF' }]}>Set as default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleDelete(addr.id)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#EB5757" />
                  <Text style={[styles.actionText, { color: '#EB5757' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {showForm && (
          <View style={[styles.formCard, cardShadow(), { backgroundColor: t.card }]}>
            <Text style={[styles.formTitle, { color: t.textPrimary }]}>Add New Address</Text>
            <Input label="Full Name *" placeholder="Enter full name" value={name} onChangeText={setName} />
            <Input label="Phone *" placeholder="10-digit mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label="Address Line 1 *" placeholder="House no., Street" value={line1} onChangeText={setLine1} />
            <Input label="Address Line 2" placeholder="Landmark, Area" value={line2} onChangeText={setLine2} />
            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Input label="City *" placeholder="City" value={city} onChangeText={setCity} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="State" placeholder="State" value={state} onChangeText={setState} />
              </View>
            </View>
            <Input label="Pincode *" placeholder="6-digit pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" />

            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: t.border }]}
                onPress={resetForm}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelBtnText, { color: t.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: t.textPrimary }]}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={[styles.saveBtnText, { color: t.background }]}>Save Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!showForm && (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: t.border }]}
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <Plus size={20} color={t.textPrimary} />
            <Text style={[styles.addBtnText, { color: t.textPrimary }]}>Add New Address</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
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
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyCard: {
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  addressCard: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addrName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  defaultBadge: {
    backgroundColor: 'rgba(76, 161, 175, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: '#4CA1AF',
  },
  addrLine: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  addrPhone: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 4,
  },
  formTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 6,
  },
  addBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});

