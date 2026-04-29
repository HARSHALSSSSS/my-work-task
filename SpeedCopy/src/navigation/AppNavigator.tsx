import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Mask, G } from 'react-native-svg';
import { Gift, ShoppingCart, Heart, User, Printer, NotebookPen } from 'lucide-react-native';
import {
  AppTabParamList,
  HomeTabStackParamList,
  GiftStackParamList,
  CartStackParamList,
  WishlistStackParamList,
  ProfileStackParamList,
} from './types';
import { useCategoryStore, CategoryMode } from '../store/useCategoryStore';
import { useThemeStore } from '../store/useThemeStore';

import { CategoryHubScreen } from '../screens/home/CategoryHubScreen';
import { PrintingCategoriesScreen } from '../screens/printing/PrintingCategoriesScreen';
import { PackagesScreen } from '../screens/printing/PackagesScreen';
import { LocationScreen } from '../screens/printing/LocationScreen';
import { StandardPrintingScreen } from '../screens/printing/StandardPrintingScreen';
import { PrintStoreScreen } from '../screens/printing/PrintStoreScreen';
import { BusinessShopByCategoryScreen } from '../screens/printing/BusinessShopByCategoryScreen';
import { BusinessPremiumDesignsScreen } from '../screens/printing/BusinessPremiumDesignsScreen';
import { PrintCustomizeScreen } from '../screens/printing/PrintCustomizeScreen';
import { CustomizeScreen } from '../screens/shared/CustomizeScreen';
import { ShopByCategoryScreen } from '../screens/shopping/ShopByCategoryScreen';
import { StationeryListScreen } from '../screens/shopping/StationeryListScreen';
import { StationeryDetailScreen } from '../screens/shopping/StationeryDetailScreen';
import { GiftStoreScreen } from '../screens/gifting/GiftStoreScreen';
import { GiftProductDetailScreen } from '../screens/gifting/GiftProductDetailScreen';
import { GiftShopByCategoryScreen } from '../screens/gifting/GiftShopByCategoryScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { AddressScreen } from '../screens/cart/AddressScreen';
import { PaymentScreen } from '../screens/cart/PaymentScreen';
import { PaymentMethodScreen } from '../screens/cart/PaymentMethodScreen';
import { TrackingScreen } from '../screens/orders/TrackingScreen';
import { MyOrdersScreen } from '../screens/orders/MyOrdersScreen';
import { WishlistScreen } from '../screens/profile/WishlistScreen';
import { WalletScreen } from '../screens/profile/WalletScreen';
import { WalletLedgerScreen } from '../screens/profile/WalletLedgerScreen';
import { AddFundsScreen } from '../screens/profile/AddFundsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ReferEarnScreen } from '../screens/profile/ReferEarnScreen';
import { NotificationsScreen } from '../screens/profile/NotificationsScreen';
import { SupportScreen } from '../screens/profile/SupportScreen';
import { RaiseTicketScreen } from '../screens/profile/RaiseTicketScreen';
import { SavedAddressScreen } from '../screens/profile/SavedAddressScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();
const HomeStack = createNativeStackNavigator<HomeTabStackParamList>();
const GiftStack = createNativeStackNavigator<GiftStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();
const WishlistStack = createNativeStackNavigator<WishlistStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

const noHeader = { headerShown: false };

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={noHeader}>
      <HomeStack.Screen name="CategoryHub" component={CategoryHubScreen} />
      <HomeStack.Screen name="PrintingCategories" component={PrintingCategoriesScreen} />
      <HomeStack.Screen name="Packages" component={PackagesScreen} />
      <HomeStack.Screen name="Location" component={LocationScreen} />
      <HomeStack.Screen name="StandardPrinting" component={StandardPrintingScreen} />
      <HomeStack.Screen name="PrintStore" component={PrintStoreScreen} />
      <HomeStack.Screen name="BusinessShopByCategory" component={BusinessShopByCategoryScreen} />
      <HomeStack.Screen name="BusinessPremiumDesigns" component={BusinessPremiumDesignsScreen} />
      <HomeStack.Screen name="ShopByCategory" component={ShopByCategoryScreen} />
      <HomeStack.Screen name="StationeryList" component={StationeryListScreen} />
      <HomeStack.Screen name="StationeryDetail" component={StationeryDetailScreen} />
      <HomeStack.Screen name="BusinessProductDetail" component={GiftProductDetailScreen} />
      <HomeStack.Screen name="PrintCustomize" component={PrintCustomizeScreen} />
    </HomeStack.Navigator>
  );
}

function GiftNavigator() {
  return (
    <GiftStack.Navigator screenOptions={noHeader}>
      <GiftStack.Screen name="GiftStore" component={GiftStoreScreen} />
      <GiftStack.Screen name="GiftProductDetail" component={GiftProductDetailScreen} />
      <GiftStack.Screen name="GiftCustomize" component={CustomizeScreen} />
      <GiftStack.Screen name="GiftShopByCategory" component={GiftShopByCategoryScreen} />
    </GiftStack.Navigator>
  );
}

function CartNavigator() {
  return (
    <CartStack.Navigator screenOptions={noHeader}>
      <CartStack.Screen name="Cart" component={CartScreen} />
      <CartStack.Screen name="Address" component={AddressScreen} />
      <CartStack.Screen name="PaymentSummary" component={PaymentScreen} />
      <CartStack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
      <CartStack.Screen name="TrackOrder" component={TrackingScreen} />
    </CartStack.Navigator>
  );
}

function WishlistNavigator() {
  return (
    <WishlistStack.Navigator screenOptions={noHeader}>
      <WishlistStack.Screen name="Wishlist" component={WishlistScreen} />
    </WishlistStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStackNav.Navigator screenOptions={noHeader}>
      <ProfileStackNav.Screen name="Profile" component={ProfileScreen} />
      <ProfileStackNav.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStackNav.Screen name="ReferEarn" component={ReferEarnScreen} />
      <ProfileStackNav.Screen name="Notifications" component={NotificationsScreen} />
      <ProfileStackNav.Screen name="Support" component={SupportScreen} />
      <ProfileStackNav.Screen name="RaiseTicket" component={RaiseTicketScreen} />
      <ProfileStackNav.Screen name="Wallet" component={WalletScreen} />
      <ProfileStackNav.Screen name="WalletLedger" component={WalletLedgerScreen} />
      <ProfileStackNav.Screen name="AddFunds" component={AddFundsScreen} />
      <ProfileStackNav.Screen name="MyOrders" component={MyOrdersScreen} />
      <ProfileStackNav.Screen name="SavedAddress" component={SavedAddressScreen} />
      <ProfileStackNav.Screen name="Tracking" component={TrackingScreen} />
    </ProfileStackNav.Navigator>
  );
}

const DEFAULT_ACTIVE = '#000000';
const INACTIVE_BLACK = '#000000';
const SERVICE_ACCENT: Record<'printing' | 'gifting' | 'shopping', string> = {
  printing: '#4CA1AF',
  gifting: '#FF7EB3',
  shopping: '#A18CD1',
};

const NAV_HEIGHT = 52;
const NAV_OUTER_BOTTOM = 10;
const NAV_H_MARGIN = 12;
const SWITCH_SIZE = 60;
export const FLOATING_TAB_CLEARANCE = NAV_HEIGHT + NAV_OUTER_BOTTOM + 24;

function HomeLogoIcon({ color, size }: { color: string; size: number }) {
  const maskId = 'switchNavMask';
  return (
    <Svg width={size} height={size} viewBox="0 0 35 35" fill="none">
      <Path
        d="M6.81651 22.5648C5.64892 21.7394 4.69403 20.6423 4.02991 19.3653C3.36578 18.0885 3.01279 16.6687 3.00034 15.225C2.98789 13.7813 3.31713 12.3555 3.95862 11.067C4.60012 9.77855 5.53691 8.66476 6.68979 7.81888C7.84268 6.97298 9.17885 6.41958 10.5852 6.20496C11.9926 5.99034 13.4295 6.12074 14.7769 6.58525C16.1233 7.04977 17.3418 7.83489 18.3284 8.87494C19.3149 9.91499 20.0424 11.1797 20.4486 12.5634H22.7272C24.077 12.5639 25.3848 13.0489 26.4167 13.9325C27.4496 14.8163 28.1409 16.0419 28.3694 17.3928C28.598 18.7438 28.3491 20.1333 27.6657 21.3158C26.9823 22.4983 25.9087 23.3976 24.6359 23.855"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Mask id={maskId} maskUnits="userSpaceOnUse" x="10" y="19" width="11" height="11">
        <Path d="M20.116 19.6576H10.4302V29.4869H20.116V19.6576Z" fill="white" />
      </Mask>
      <G mask={`url(#${maskId})`}>
        <Path
          d="M13.3049 26.676H12.4971C12.2833 26.676 12.0785 26.5897 11.9269 26.436C11.7753 26.2825 11.6904 26.0741 11.6904 25.8569V23.8092C11.6904 23.5918 11.7753 23.3836 11.9269 23.2299C12.0785 23.0763 12.2833 22.99 12.4971 22.99H18.9551C19.1689 22.99 19.3737 23.0763 19.5253 23.2299C19.6769 23.3836 19.7617 23.5918 19.7617 23.8092V25.8569C19.7617 26.0741 19.6769 26.2825 19.5253 26.436C19.3737 26.5897 19.1689 26.676 18.9551 26.676H18.1473M13.3049 22.99V20.5327C13.3049 20.4241 13.3468 20.32 13.4226 20.2432C13.4984 20.1663 13.6013 20.1232 13.7077 20.1232H17.7445C17.8508 20.1232 17.9538 20.1663 18.0296 20.2432C18.1054 20.32 18.1473 20.4241 18.1473 20.5327V22.99M13.7077 25.0378H17.7445C17.9674 25.0378 18.1473 25.2212 18.1473 25.4474V27.9046C18.1473 28.1308 17.9674 28.3142 17.7445 28.3142H13.7077C13.4848 28.3142 13.3049 28.1308 13.3049 27.9046V25.4474C13.3049 25.2212 13.4848 25.0378 13.7077 25.0378Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

function getCategoryLabel(mode: CategoryMode): string {
  switch (mode) {
    case 'printing': return 'Print';
    case 'shopping': return 'Shopping';
    default: return 'Gift';
  }
}

function getCategoryIcon(mode: CategoryMode, size: number, color: string) {
  switch (mode) {
    case 'printing': return <Printer size={size} color={color} />;
    case 'shopping': return <NotebookPen size={size} color={color} strokeWidth={2.2} />;
    default: return <Gift size={size} color={color} />;
  }
}

function getCurrentHomeRouteName(route: any): string {
  const state = route?.state;
  if (!state || !state.routes?.length) return 'CategoryHub';
  const active = state.routes[state.index ?? 0];
  return active?.name ?? 'CategoryHub';
}

function getCurrentNestedRouteName(route: any, fallback: string): string {
  const state = route?.state;
  if (!state || !state.routes?.length) return fallback;
  const active = state.routes[state.index ?? 0];
  return active?.name ?? fallback;
}

const tabStyles = StyleSheet.create({
  navWrap: {
    position: 'absolute',
    left: NAV_H_MARGIN,
    right: NAV_H_MARGIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 50,
  },
  switchBtn: {
    width: SWITCH_SIZE,
    height: SWITCH_SIZE,
    borderRadius: SWITCH_SIZE / 2,
    borderWidth: 1.2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  switchContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  switchLabel: {
    marginTop: 3,
    fontFamily: 'Poppins_500Medium',
    fontSize: 9.5,
    lineHeight: 11,
    color: DEFAULT_ACTIVE,
    includeFontPadding: false,
  },
  ovalWrap: {
    flex: 1,
    height: NAV_HEIGHT,
    borderRadius: NAV_HEIGHT / 2,
    borderWidth: 1.2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: { elevation: 11 },
    }),
  },
  blurFill: {
    ...StyleSheet.absoluteFillObject,
  },
  switchHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SWITCH_SIZE * 0.6,
  },
  navHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: NAV_HEIGHT * 0.62,
  },
  serviceBtn: {
    height: NAV_HEIGHT - 4,
    borderRadius: (NAV_HEIGHT - 4) / 2,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceBtnActive: {
    backgroundColor: '#000000',
  },
  serviceLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    lineHeight: 13,
    includeFontPadding: false,
    textAlign: 'center',
  },
  itemBtn: {
    flex: 1,
    height: NAV_HEIGHT - 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  itemLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10.5,
    lineHeight: 12,
    includeFontPadding: false,
  },
});

function BottomNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const mode = useCategoryStore((s) => s.mode);
  const setMode = useCategoryStore((s) => s.setMode);
  const themeMode = useThemeStore((s) => s.mode);

  const activeRouteName = state.routes[state.index]?.name;
  const homeRoute = state.routes.find((r) => r.name === 'HomeTab');
  const cartRoute = state.routes.find((r) => r.name === 'CartTab');
  const profileRoute = state.routes.find((r) => r.name === 'ProfileTab');
  const currentHomeRouteName = getCurrentHomeRouteName(homeRoute);
  const hideOnCategoryHub = activeRouteName === 'HomeTab' && currentHomeRouteName === 'CategoryHub';
  const hideOnPrintingCategories = activeRouteName === 'HomeTab' && currentHomeRouteName === 'PrintingCategories';
  const hideOnRefer = activeRouteName === 'ProfileTab' && getCurrentNestedRouteName(profileRoute, 'Profile') === 'ReferEarn';
  if (hideOnCategoryHub || hideOnPrintingCategories || hideOnRefer) return null;

  const serviceMode = mode === 'home' ? 'gifting' : mode;
  const serviceLabel = getCategoryLabel(serviceMode);
  const serviceAlwaysHighlighted = mode !== 'home';
  const serviceIconSize = serviceMode === 'printing' ? 17 : 21;
  const serviceButtonWidth = serviceMode === 'shopping' ? 100 : 86;

  const onPressSwitch = () => {
    setMode('home');
    navigation.navigate('HomeTab', { screen: 'CategoryHub' } as never);
  };

  const onPressService = () => {
    if (serviceMode === 'printing') {
      setMode('printing');
      navigation.navigate('HomeTab', { screen: 'PrintingCategories' } as never);
      return;
    }
    if (serviceMode === 'shopping') {
      setMode('shopping');
      navigation.navigate('HomeTab', { screen: 'ShopByCategory' } as never);
      return;
    }
    setMode('gifting');
    navigation.navigate('GiftTab', { screen: 'GiftStore' } as never);
  };

  const onPressCart = () => {
    const cartStackKey = (cartRoute?.state as any)?.key;
    if (cartStackKey) {
      navigation.dispatch({
        ...StackActions.popToTop(),
        target: cartStackKey,
      });
    }
    navigation.navigate('CartTab', { screen: 'Cart' } as never);
  };

  const serviceAccent = SERVICE_ACCENT[serviceMode];
  const itemColor = (isFocused: boolean) => (isFocused ? serviceAccent : INACTIVE_BLACK);
  const switchGlassStyle = {
    backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.88)',
    borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.95)',
  };
  const navGlassStyle = {
    backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.84)',
    borderColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.95)',
  };
  const navGlassGradient = themeMode === 'dark'
    ? (['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)'] as const)
    : (['rgba(214,229,247,0.2)', 'rgba(184,206,232,0.07)'] as const);
  const navTopHighlight = themeMode === 'dark'
    ? (['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.01)'] as const)
    : (['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.0)'] as const);
  const switchTopHighlight = themeMode === 'dark'
    ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.0)'] as const)
    : (['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.0)'] as const);
  const blurTint = themeMode === 'dark' ? 'dark' : 'default';
  const navBlurIntensity = themeMode === 'dark' ? 58 : 54;
  const switchBlurIntensity = themeMode === 'dark' ? 52 : 48;
  const useBlurLayer = false;
  const useSwitchBlurLayer = false;

  return (
    <View style={[tabStyles.navWrap, { bottom: Math.max(insets.bottom, 4) + NAV_OUTER_BOTTOM }]}>
      <TouchableOpacity activeOpacity={0.9} style={[tabStyles.switchBtn, switchGlassStyle]} onPress={onPressSwitch}>
        {useSwitchBlurLayer && (
          <BlurView
            style={tabStyles.blurFill}
            tint={blurTint}
            intensity={switchBlurIntensity}
          />
        )}
        <LinearGradient
          colors={switchTopHighlight}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={tabStyles.switchHighlight}
          pointerEvents="none"
        />
        <View style={tabStyles.switchContent}>
          <HomeLogoIcon color={DEFAULT_ACTIVE} size={22} />
          <Text style={tabStyles.switchLabel} allowFontScaling={false}>Switch</Text>
        </View>
      </TouchableOpacity>

      <LinearGradient
        colors={navGlassGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[tabStyles.ovalWrap, navGlassStyle]}
      >
        {useBlurLayer && (
          <BlurView
            style={tabStyles.blurFill}
            tint={blurTint}
            intensity={navBlurIntensity}
          />
        )}
        <LinearGradient
          colors={navTopHighlight}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={tabStyles.navHighlight}
          pointerEvents="none"
        />
        <TouchableOpacity
          activeOpacity={0.92}
          style={[
            tabStyles.serviceBtn,
            { width: serviceButtonWidth },
            serviceAlwaysHighlighted && tabStyles.serviceBtnActive,
          ]}
          onPress={onPressService}
        >
          {getCategoryIcon(serviceMode, serviceIconSize, serviceAlwaysHighlighted ? '#FFFFFF' : DEFAULT_ACTIVE)}
          <Text
            style={[
              tabStyles.serviceLabel,
              { color: serviceAlwaysHighlighted ? '#FFFFFF' : DEFAULT_ACTIVE },
            ]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {serviceLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={tabStyles.itemBtn}
          onPress={onPressCart}
        >
          <ShoppingCart size={21} color={itemColor(activeRouteName === 'CartTab')} />
          <Text style={[tabStyles.itemLabel, { color: itemColor(activeRouteName === 'CartTab') }]} allowFontScaling={false}>
            Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={tabStyles.itemBtn}
          onPress={() => navigation.navigate('WishlistTab')}
        >
          <Heart size={21} color={itemColor(activeRouteName === 'WishlistTab')} />
          <Text style={[tabStyles.itemLabel, { color: itemColor(activeRouteName === 'WishlistTab') }]} allowFontScaling={false}>
            Wishlist
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={tabStyles.itemBtn}
          onPress={() => navigation.navigate('ProfileTab', { screen: 'Profile' })}
        >
          <User size={21} color={itemColor(activeRouteName === 'ProfileTab')} />
          <Text style={[tabStyles.itemLabel, { color: itemColor(activeRouteName === 'ProfileTab') }]} allowFontScaling={false}>
            Profile
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        lazy: true,
        freezeOnBlur: true,
        popToTopOnBlur: true,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        listeners={{
          tabPress: () => {
            useCategoryStore.getState().setMode('home');
          },
        }}
      />
      <Tab.Screen name="GiftTab" component={GiftNavigator} />
      <Tab.Screen name="CartTab" component={CartNavigator} />
      <Tab.Screen name="WishlistTab" component={WishlistNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
