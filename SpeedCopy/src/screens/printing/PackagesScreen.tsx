import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft, ChevronUp, ChevronDown,
  Package, Truck, Zap, Rocket,
} from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { PrintStackParamList } from '../../navigation/types';
import { useThemeStore } from '../../store/useThemeStore';
import * as productsApi from '../../api/products';
import { useOrderStore } from '../../store/useOrderStore';
import { Radii, Spacing, Typography } from '../../constants/theme';
import { resolvePickupEtaLabel } from '../../utils/pickupEta';

type Nav = NativeStackNavigationProp<PrintStackParamList, 'Packages'>;
type Route = RouteProp<PrintStackParamList, 'Packages'>;

type DeliveryMethod = 'pickup' | 'delivery';

type PackageOption = {
  id: string;
  visualKey: 'standard' | 'express' | 'instant';
  name: string;
  duration: string;
  iconName: 'truck' | 'rocket' | 'bolt';
  iconBgColor: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  bullets: string[];
};

const PACKAGES: PackageOption[] = [
  {
    id: 'standard',
    visualKey: 'standard',
    name: 'Standard',
    duration: '3-4 Business Days',
    iconName: 'truck',
    iconBgColor: '#4B8EE8',
    iconColor: '#FFFFFF',
    bgColor: '#EAF2FF',
    borderColor: '#DCE8FF',
    bullets: [
      'Most economical option',
      'Basic tracking included',
      'Perfect for non-urgent prints',
    ],
  },
  {
    id: 'express',
    visualKey: 'express',
    name: 'Express',
    duration: '24 Hour Delivery',
    iconName: 'rocket',
    iconBgColor: '#F5AE22',
    iconColor: '#FFFFFF',
    bgColor: '#F9EDD6',
    borderColor: '#F2E2C2',
    bullets: [
      'Priority processing',
      'Real-time tracking',
      'Faster turnaround',
    ],
  },
  {
    id: 'instant',
    visualKey: 'instant',
    name: 'Instant',
    duration: '2-3 Hour Delivery',
    iconName: 'bolt',
    iconBgColor: '#FF4957',
    iconColor: '#FFFFFF',
    bgColor: '#FCE4EA',
    borderColor: '#F6D4DE',
    bullets: [
      'Immediate processing',
      'Live tracking updates',
      'Ideal for urgent prints',
    ],
  },
];

function detectVisualKey(pkg: any): 'standard' | 'express' | 'instant' {
  const raw = `${pkg?.type || ''} ${pkg?.name || ''}`.toLowerCase();
  if (raw.includes('instant')) return 'instant';
  if (raw.includes('express')) return 'express';
  return 'standard';
}

function getVisualTheme(key: 'standard' | 'express' | 'instant') {
  if (key === 'instant') {
    return {
      iconName: 'bolt' as const,
      iconBgColor: '#FF4957',
      iconColor: '#FFFFFF',
      bgColor: '#FCE4EA',
      borderColor: '#F6D4DE',
    };
  }
  if (key === 'express') {
    return {
      iconName: 'rocket' as const,
      iconBgColor: '#F5AE22',
      iconColor: '#FFFFFF',
      bgColor: '#F9EDD6',
      borderColor: '#F2E2C2',
    };
  }
  return {
    iconName: 'truck' as const,
    iconBgColor: '#4B8EE8',
    iconColor: '#FFFFFF',
    bgColor: '#EAF2FF',
    borderColor: '#DCE8FF',
  };
}

function normalizeServicePackageId(value: string): 'standard' | 'express' | 'instant' {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('instant')) return 'instant';
  if (normalized.includes('express')) return 'express';
  return 'standard';
}

export const PackagesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { subService } = route.params;
  const { colors: t } = useThemeStore();
  const addresses = useOrderStore((s) => s.addresses);

  const [method, setMethod] = useState<DeliveryMethod>('delivery');
  const [expandedId, setExpandedId] = useState<string>('standard');

  const [packages, setPackages] = useState<PackageOption[]>(PACKAGES);
  const primaryAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const currentLocationText = primaryAddress
    ? [primaryAddress.line1, primaryAddress.line2, `${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.pincode}`]
        .filter(Boolean)
        .join(', ')
    : 'Select a location';
  const pickupEtaPreview = resolvePickupEtaLabel(primaryAddress, '');

  useFocusEffect(useCallback(() => {
    productsApi.getServicePackages()
      .then((data) => {
        const mapped = (data || [])
          .map((pkg: any) => {
            const visualKey = detectVisualKey(pkg);
            const theme = getVisualTheme(visualKey);
            return {
              id: pkg.id || pkg._id || pkg.slug,
              visualKey,
              name: pkg.name || 'Standard',
              duration: pkg.duration || pkg.deliveryTime || '',
              iconName: theme.iconName,
              iconBgColor: theme.iconBgColor,
              iconColor: theme.iconColor,
              bgColor: theme.bgColor,
              borderColor: theme.borderColor,
              bullets: pkg.features || pkg.bullets || [],
            };
          })
          .filter((pkg: PackageOption) => Boolean(pkg.id));
        if (mapped.length) {
          setPackages(mapped);
          setExpandedId((prev) => (mapped.some((p) => p.id === prev) ? prev : mapped[0].id));
        } else {
          setPackages(PACKAGES);
          setExpandedId((prev) => (PACKAGES.some((p) => p.id === prev) ? prev : PACKAGES[0].id));
        }
      })
      .catch(() => {
        setPackages(PACKAGES);
        setExpandedId((prev) => (PACKAGES.some((p) => p.id === prev) ? prev : PACKAGES[0].id));
      });
  }, []));

  const onToggle = (id: string) => {
    setExpandedId(expandedId === id ? '' : id);
  };

  const onSelect = (packageId: string) => {
    navigation.navigate('StandardPrinting', {
      subService,
      deliveryMode: 'delivery',
      servicePackage: normalizeServicePackageId(packageId),
    });
  };

  const onSelectPickup = useCallback(() => {
    navigation.navigate('Location', {
      subService,
      deliveryMode: 'pickup',
      pickupEtaLabel: pickupEtaPreview || undefined,
    });
  }, [navigation, pickupEtaPreview, subService]);

  const onChangeLocation = useCallback(() => {
    const parentNav = navigation.getParent();
    if (parentNav) {
      (parentNav as any).navigate('CartTab', { screen: 'Address' });
    }
  }, [navigation]);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Packages</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Current Location */}
        <View style={[styles.locationRow, { borderColor: t.border, backgroundColor: t.card }]}>
          <View style={styles.locationLeft}>
            <Text style={[styles.locationLabel, { color: t.textSecondary }]}>CURRENT LOCATION</Text>
            <View style={styles.locationAddrRow}>
              <View style={styles.greenDot} />
              <Text style={[styles.locationAddr, { color: t.textPrimary }]} numberOfLines={2}>{currentLocationText}</Text>
            </View>
            {pickupEtaPreview ? (
              <Text style={styles.pickupEtaLabel}>Pickup ETA: {pickupEtaPreview}</Text>
            ) : (
              <Text style={[styles.pickupEtaLabel, styles.pickupEtaMuted]}>
                Pickup timing will appear after store selection
              </Text>
            )}
          </View>
          <TouchableOpacity style={[styles.changePill, { borderColor: t.border }]} activeOpacity={0.8} onPress={onChangeLocation}>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Choose Method */}
        <Text style={[styles.methodLabel, { color: t.textMuted }]}>Choose Method</Text>
        <View style={[styles.methodTabs, { backgroundColor: t.chipBg }]}>
          <TouchableOpacity
            style={[styles.methodTab, method === 'pickup' && [styles.methodTabActive, { backgroundColor: t.card }]]}
            onPress={onSelectPickup}
            activeOpacity={0.85}
          >
            <Package size={16} color={method === 'pickup' ? t.textPrimary : t.placeholder} />
            <Text style={[styles.methodTabText, { color: t.placeholder }, method === 'pickup' && [styles.methodTabTextActive, { color: t.textPrimary }]]}>
              Pickup
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodTab, method === 'delivery' && [styles.methodTabActive, { backgroundColor: t.card }]]}
            onPress={() => setMethod('delivery')}
            activeOpacity={0.85}
          >
            <Truck size={16} color={method === 'delivery' ? t.textPrimary : t.placeholder} />
            <Text style={[styles.methodTabText, { color: t.placeholder }, method === 'delivery' && [styles.methodTabTextActive, { color: t.textPrimary }]]}>
              Delivery
            </Text>
          </TouchableOpacity>
        </View>

        {method === 'delivery' ? (
          <>
            <Text style={[styles.packageHeading, { color: t.textPrimary }]}>Choose your package</Text>

            <View style={styles.packageList}>
              {packages.map((pkg) => {
                const expanded = expandedId === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.packageCard, { backgroundColor: pkg.bgColor, borderColor: pkg.borderColor }]}
                    activeOpacity={0.9}
                    onPress={() => onToggle(pkg.id)}
                  >
                    <View style={styles.packageHeader}>
                      <View style={[styles.packageIconWrap, { backgroundColor: pkg.iconBgColor }]}>
                        {pkg.iconName === 'rocket' ? (
                          <Rocket size={18} color={pkg.iconColor} />
                        ) : pkg.iconName === 'bolt' ? (
                          <Zap size={18} color={pkg.iconColor} />
                        ) : (
                          <Truck size={18} color={pkg.iconColor} />
                        )}
                      </View>
                      <View style={styles.packageInfo}>
                        <Text style={[styles.packageName, { color: t.textPrimary }]}>{pkg.name}</Text>
                        <Text style={[styles.packageDuration, { color: t.textSecondary }]}>{pkg.duration}</Text>
                      </View>
                      {expanded ? (
                        <ChevronUp size={20} color={t.textSecondary} />
                      ) : (
                        <ChevronDown size={20} color={t.textSecondary} />
                      )}
                    </View>

                    {expanded && (
                      <View style={styles.packageExpanded}>
                        {pkg.bullets.map((bullet, idx) => (
                          <View key={idx} style={styles.bulletRow}>
                            <Text style={[styles.bulletDot, { color: t.textMuted }]}>{'\u2022'}</Text>
                            <Text style={[styles.bulletText, { color: t.textMuted }]}>{bullet}</Text>
                          </View>
                        ))}
                        <TouchableOpacity
                          style={[styles.selectBtn, { borderColor: t.textPrimary, backgroundColor: t.card }]}
                          activeOpacity={0.85}
                          onPress={() => onSelect(pkg.id)}
                        >
                          <Text style={[styles.selectBtnText, { color: t.textPrimary }]}>Select</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.title,
    textAlign: 'center',
  },
  scroll: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radii.section,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    ...Platform.select({
      ios: { shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  locationLeft: {
    flex: 1,
    gap: Spacing.xxs,
  },
  locationLabel: {
    ...Typography.small,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  locationAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27AE60',
  },
  locationAddr: {
    ...Typography.bodySm,
    fontFamily: 'Poppins_500Medium',
    flex: 1,
  },
  pickupEtaLabel: {
    ...Typography.caption,
    fontFamily: 'Poppins_600SemiBold',
    color: '#0F766E',
    marginTop: Spacing.xs,
  },
  pickupEtaMuted: {
    color: '#6B7280',
  },
  changeLink: {
    ...Typography.bodySm,
    fontFamily: 'Poppins_500Medium',
    color: '#66C28A',
  },
  changePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginLeft: Spacing.sm,
  },

  methodLabel: {
    ...Typography.subtitle,
    marginBottom: Spacing.xs,
  },
  methodTabs: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    backgroundColor: '#EDEFF3',
    borderRadius: Radii.input,
    padding: 2,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.small,
  },
  methodTabActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  methodTabText: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: '#A5A5A5',
  },
  methodTabTextActive: {
    color: '#000000',
  },

  packageHeading: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  packageList: {
    gap: Spacing.sm,
  },
  packageCard: {
    borderRadius: Radii.section,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    overflow: 'hidden',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  packageIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageInfo: {
    flex: 1,
    gap: 1,
  },
  packageName: {
    ...Typography.h4,
    fontFamily: 'Poppins_600SemiBold',
  },
  packageDuration: {
    ...Typography.caption,
  },
  packageExpanded: {
    marginTop: Spacing.sm,
    paddingLeft: 44,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xxs,
  },
  bulletDot: {
    ...Typography.bodySm,
    lineHeight: 18,
  },
  bulletText: {
    ...Typography.bodySm,
    lineHeight: 18,
    flex: 1,
  },
  selectBtn: {
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: Radii.small,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  selectBtnText: {
    ...Typography.bodyBold,
    fontFamily: 'Poppins_500Medium',
  },
});

