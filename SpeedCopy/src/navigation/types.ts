import { NavigatorScreenParams } from '@react-navigation/native';
import { PrintingSubService } from '../types';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
};

export type AppTabParamList = {
  HomeTab: NavigatorScreenParams<HomeTabStackParamList>;
  GiftTab: NavigatorScreenParams<GiftStackParamList>;
  CartTab: NavigatorScreenParams<CartStackParamList>;
  WishlistTab: NavigatorScreenParams<WishlistStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type HomeTabStackParamList = {
  CategoryHub: undefined;
  PrintingCategories: undefined;
  Packages: { subService: PrintingSubService };
  Location: {
    subService: PrintingSubService;
    deliveryMode: 'pickup' | 'delivery';
    servicePackage?: 'standard' | 'express' | 'instant';
  };
  StandardPrinting: {
    subService: PrintingSubService;
    deliveryMode?: 'pickup' | 'delivery';
    locationId?: string;
    servicePackage?: 'standard' | 'express' | 'instant';
  };
  PrintStore: undefined;
  BusinessShopByCategory: {
    productId?: string;
    name?: string;
    image?: string;
    category?: string;
    price?: number;
    originalPrice?: number;
    discount?: string;
  };
  BusinessPremiumDesigns: {
    productId: string;
    name?: string;
    image?: string;
    category?: string;
    price?: number;
    originalPrice?: number;
    discount?: string;
  };
  BusinessProductDetail: {
    productId: string;
    image?: string;
    flowType?: 'printing' | 'gifting' | 'shopping';
    name?: string;
    price?: number;
    originalPrice?: number;
    discount?: string;
  };
  ShopByCategory: undefined;
  StationeryList: { category?: string };
  StationeryDetail: {
    productId: string;
    image?: string;
    name?: string;
    price?: number;
    originalPrice?: number;
    discount?: string;
  };
  PrintCustomize: {
    productId: string;
    flowType?: 'printing' | 'gifting' | 'shopping';
    image?: string;
    name?: string;
    designId?: string;
  };
};

export type GiftStackParamList = {
  GiftStore: undefined;
  GiftProductDetail: {
    productId: string;
    image?: string;
    flowType?: 'printing' | 'gifting' | 'shopping';
    name?: string;
    price?: number;
    originalPrice?: number;
    discount?: string;
  };
  GiftCustomize: {
    productId: string;
    flowType?: 'printing' | 'gifting' | 'shopping';
    image?: string;
    name?: string;
  };
  GiftShopByCategory: { productId?: string };
};

export type CartStackParamList = {
  Cart: undefined;
  Address: { couponCode?: string; couponDiscount?: number } | undefined;
  PaymentSummary: { addressId?: string; couponCode?: string; couponDiscount?: number } | undefined;
  PaymentMethod: { addressId?: string; total?: number; couponCode?: string; couponDiscount?: number } | undefined;
  TrackOrder: { orderId: string };
};

export type WishlistStackParamList = {
  Wishlist: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  ReferEarn: { from?: 'home' | 'profile' } | undefined;
  Notifications: undefined;
  Support: undefined;
  RaiseTicket: undefined;
  Wallet: undefined;
  WalletLedger: undefined;
  AddFunds: undefined;
  MyOrders: undefined;
  SavedAddress: undefined;
  Tracking: { orderId: string };
};

// Backward-compatible aliases
export type SwitchStackParamList = HomeTabStackParamList;
export type PrintStackParamList = HomeTabStackParamList;
export type HomeStackParamList = HomeTabStackParamList & GiftStackParamList;
export type OrdersStackParamList = {
  MyOrders: undefined;
  Tracking: { orderId: string };
};
export type WalletStackParamList = {
  Wallet: undefined;
  WalletLedger: undefined;
  AddFunds: undefined;
};
