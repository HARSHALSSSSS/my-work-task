import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Search } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import { useOrderStore } from '../../store/useOrderStore';
import * as productsApi from '../../api/products';
import { resolvePickupEtaLabel } from '../../utils/pickupEta';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'Location'>;
type Route = RouteProp<PrintStackParamList, 'Location'>;

type LocationItem = {
  id: string;
  title: string;
  address: string;
  pincode: string;
  etaLabel: string;
};

export const LocationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { subService, deliveryMode, servicePackage, pickupEtaLabel } = route.params;
  const { colors: t } = useThemeStore();
  const { fetchAddresses } = useOrderStore();
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const trimmedQuery = query.trim();
  const isPincodeQuery = /^\d{6}$/.test(trimmedQuery);
  const activePincode = isPincodeQuery ? trimmedQuery : '';

  useEffect(() => {
    fetchAddresses().catch(() => {});
  }, [fetchAddresses]);

  useEffect(() => {
    setLoading(true);
    productsApi.getPickupLocations()
      .then((data) => {
        const mapped = (data || [])
          .map((loc: any): LocationItem => {
            const title = String(loc.name || loc.shopName || loc.storeName || 'Pickup location').trim();
            const addressParts = [
              loc.address,
              loc.addressLine,
              loc.area,
              loc.locality,
              loc.landmark,
              loc.city,
              loc.state,
            ]
              .map((part) => String(part || '').trim())
              .filter(Boolean);
            const pincode = String(loc.pincode || '').trim();
            return {
              id: loc._id || loc.id,
              title,
              address: [addressParts.join(', '), pincode].filter(Boolean).join(' - '),
              pincode,
              etaLabel: resolvePickupEtaLabel(loc, pickupEtaLabel || ''),
            };
          })
          .filter((loc) => Boolean(loc.id && loc.address));
        setLocations(mapped);
      })
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, [pickupEtaLabel, servicePackage]);

  const filtered = React.useMemo(
    () => (activePincode ? locations.filter((location) => location.pincode === activePincode) : locations),
    [activePincode, locations],
  );

  const emptyMessage = (() => {
    if (trimmedQuery && !isPincodeQuery) {
      return 'Please enter a valid 6-digit pincode to search pickup locations.';
    }
    if (isPincodeQuery) {
      return 'No pickup available for this pincode';
    }
    return 'No pickup locations available right now.';
  })();

  const onLocationSelect = useCallback((location: LocationItem) => {
    navigation.navigate('StandardPrinting', {
      subService,
      deliveryMode,
      locationId: location.id,
      servicePackage,
      pickupEtaLabel: location.etaLabel || undefined,
      pickupLocationTitle: location.title,
    });
  }, [deliveryMode, navigation, servicePackage, subService]);

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
          placeholder="Enter 6-digit pincode"
          placeholderTextColor={t.placeholder}
          value={query}
          onChangeText={setQuery}
          keyboardType="number-pad"
          maxLength={6}
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
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={t.textPrimary} />
          </View>
        )}
        {filtered.map((location) => (
          <TouchableOpacity
            key={location.id}
            style={[
              styles.locationItem,
              { backgroundColor: t.card, borderBottomColor: t.divider },
              activePincode && location.pincode === activePincode ? styles.locationItemActive : null,
            ]}
            activeOpacity={0.7}
            onPress={() => onLocationSelect(location)}
          >
            <Text style={[styles.locationTitle, { color: t.textPrimary }]}>{location.title}</Text>
            <Text style={[styles.locationText, { color: t.textSecondary }]}>{location.address}</Text>
            {location.etaLabel ? <Text style={styles.locationEta}>{location.etaLabel}</Text> : null}
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
    lineHeight: 20,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  scroll: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  loadingWrap: {
    paddingTop: 24,
    alignItems: 'center',
  },
  locationItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  locationItemActive: {
    borderLeftWidth: 3,
    borderLeftColor: '#0F766E',
  },
  locationTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  locationText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  locationEta: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    lineHeight: 18,
    color: '#0F766E',
    marginTop: 6,
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

