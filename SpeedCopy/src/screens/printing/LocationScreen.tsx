import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Search } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import { useOrderStore } from '../../store/useOrderStore';
import * as productsApi from '../../api/products';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'Location'>;
type Route = RouteProp<PrintStackParamList, 'Location'>;

type LocationItem = {
  id: string;
  address: string;
};

export const LocationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { subService, deliveryMode, servicePackage } = route.params;
  const { colors: t } = useThemeStore();
  const { addresses, fetchAddresses } = useOrderStore();
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const trimmedQuery = query.trim();
  const isPincodeQuery = /^\d{6}$/.test(trimmedQuery);
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
  const pincodeFromAddress = defaultAddress?.pincode?.trim() || '';
  const activePincode = isPincodeQuery ? trimmedQuery : pincodeFromAddress;

  useEffect(() => {
    fetchAddresses().catch(() => {});
  }, [fetchAddresses]);

  useEffect(() => {
    if (!activePincode) {
      setLocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    productsApi.getPickupLocations({ pincode: activePincode })
      .then((data) => {
        const mapped = (data || [])
          .map((loc: any) => ({
            id: loc._id || loc.id,
            address: `${loc.name || ''}, ${loc.address || ''}, ${loc.city || ''}, ${loc.state || ''} ${loc.pincode || ''}`
              .replace(/\s+/g, ' ')
              .replace(/\s+,/g, ',')
              .trim(),
          }))
          .filter((loc: LocationItem) => Boolean(loc.id && loc.address));
        setLocations(mapped);
      })
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, [activePincode]);

  const filtered = trimmedQuery && !isPincodeQuery
    ? locations.filter((l) =>
        l.address.toLowerCase().includes(query.toLowerCase()),
    )
    : locations;

  const emptyMessage = (() => {
    if (trimmedQuery && !isPincodeQuery) {
      return 'Please enter a valid 6-digit pincode to search pickup locations.';
    }
    if (isPincodeQuery) {
      return 'No pickup available for this pincode';
    }
    return 'Add/select an address with pincode or type a 6-digit pincode to fetch pickup locations.';
  })();

  const onLocationSelect = (locationId: string) => {
    navigation.navigate('StandardPrinting', {
      subService,
      deliveryMode,
      locationId,
      servicePackage,
    });
  };

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Location</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { borderBottomColor: t.searchBorder }]}>
        <Search size={18} color={t.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: t.textPrimary }]}
          placeholder="Search"
          placeholderTextColor={t.placeholder}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      {/* Location List */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {filtered.map((location) => (
          <TouchableOpacity
            key={location.id}
            style={[styles.locationItem, { backgroundColor: t.card, borderBottomColor: t.divider }]}
            activeOpacity={0.7}
            onPress={() => onLocationSelect(location.id)}
          >
            <Text style={[styles.locationText, { color: t.textPrimary }]}>{location.address}</Text>
          </TouchableOpacity>
        ))}
        {!loading && filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: t.textSecondary }]}>{emptyMessage}</Text>
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  );
};

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
    lineHeight: 28,
    color: '#242424',
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 2,
    height: 44,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#000',
    padding: 0,
  },
  scroll: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  locationItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  locationText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#242424',
  },
  emptyWrap: {
    paddingHorizontal: 16,
    paddingTop: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});

