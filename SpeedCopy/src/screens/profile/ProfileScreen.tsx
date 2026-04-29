﻿import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  User, ShoppingBag, Wallet, MapPin, Gift, Bell, HelpCircle,
  Trash2, LogOut, ChevronLeft, ChevronRight, Camera, Pencil,
} from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { ProfileStackParamList, AppTabParamList } from '../../navigation/types';
import * as userApi from '../../api/user';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'Profile'>,
  BottomTabNavigationProp<AppTabParamList>
>;

interface MenuItem {
  icon: React.ElementType;
  iconBg: string;
  label: string;
  onPress: () => void;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { userName, phone, userEmail, profileImage, setProfileImage, setUserName, setPhone, logout } = useAuthStore();
  const { mode: themeMode, toggle: toggleTheme, colors: t } = useThemeStore();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setProfileLoading(true);
    setProfileError(null);
    userApi.getProfile()
      .then((p) => {
        if (p?.name) setUserName(p.name);
        if (p?.phone) setPhone(p.phone);
        if (p?.avatar) setProfileImage(p.avatar);
      })
      .catch((e) => setProfileError(e?.serverMessage || e?.message || 'Could not load your profile.'))
      .finally(() => setProfileLoading(false));
  }, [setUserName, setPhone, setProfileImage]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Are you sure? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await userApi.requestAccountDeletion();
            if (res.accountDeletionStatus === 'blocked_active_orders') {
              Alert.alert('Cannot Delete', 'You have active orders. Please wait until they are completed or cancelled.');
            } else {
              Alert.alert('Request Submitted', 'Your account deletion request has been submitted.');
              logout();
            }
          } catch (e: any) {
            const msg = e?.serverMessage || e?.message || 'Failed to delete account';
            if (msg.includes('active_orders') || e?.status === 409) {
              Alert.alert('Cannot Delete', 'You have active orders. Please wait until they are completed or cancelled.');
            } else {
              Alert.alert('Error', msg);
            }
          }
        },
      },
    ]);
  };

  const group1: MenuItem[] = [
    { icon: Pencil, iconBg: 'rgba(76, 161, 175, 0.2)', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: ShoppingBag, iconBg: 'rgba(47, 128, 237, 0.2)', label: 'My Orders', onPress: () => navigation.navigate('MyOrders') },
    { icon: Wallet, iconBg: 'rgba(39, 174, 96, 0.2)', label: 'Wallet Overview', onPress: () => navigation.navigate('Wallet') },
    { icon: Wallet, iconBg: 'rgba(47, 128, 237, 0.15)', label: 'Wallet Ledger', onPress: () => navigation.navigate('WalletLedger') },
    { icon: MapPin, iconBg: 'rgba(242, 153, 74, 0.2)', label: 'Saved Address', onPress: () => navigation.navigate('SavedAddress') },
  ];

  const group2: MenuItem[] = [
    { icon: Gift, iconBg: 'rgba(155, 81, 224, 0.2)', label: 'Refer & Earn', onPress: () => navigation.navigate('ReferEarn', { from: 'profile' }) },
    { icon: Bell, iconBg: 'rgba(235, 87, 87, 0.2)', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    { icon: HelpCircle, iconBg: 'rgba(45, 156, 156, 0.2)', label: 'Help & Support', onPress: () => navigation.navigate('Support') },
  ];

  const group3: MenuItem[] = [
    { icon: HelpCircle, iconBg: 'rgba(45, 156, 156, 0.2)', label: 'FAQs', onPress: () => navigation.navigate('Support') },
    { icon: Trash2, iconBg: 'rgba(235, 87, 87, 0.1)', label: 'Delete my account', onPress: handleDeleteAccount },
  ];

  const renderMenuGroup = (items: MenuItem[], groupHeight: number) => (
    <View style={[styles.menuGroup, { height: groupHeight, backgroundColor: t.card, borderColor: t.border }]}>
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={item.label}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: item.iconBg }]}>
                  <Icon size={22} color={t.iconDefault} />
                </View>
                <Text style={[styles.menuLabel, { color: t.textPrimary }]}>{item.label}</Text>
              </View>
              <TouchableOpacity onPress={item.onPress} style={styles.menuChevron} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <ChevronRight size={20} color={t.chevron} />
              </TouchableOpacity>
            </View>
            {!isLast && <View style={[styles.menuSeparator, { backgroundColor: t.divider }]} />}
          </React.Fragment>
        );
      })}
    </View>
  );

  return (
    <SafeScreen>
      <View style={[styles.headerBar, { backgroundColor: t.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {profileLoading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator color={t.textSecondary} />
          <Text style={[styles.loadingText, { color: t.textSecondary }]}>Loading your profile…</Text>
        </View>
      )}
      {!profileLoading && profileError && (
        <View style={[styles.errorBanner, { backgroundColor: t.chipBg }]}>
          <Text style={[styles.errorText, { color: t.textPrimary }]}>{profileError}</Text>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.avatarCard, { backgroundColor: t.card }]}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.avatarTouchable}>
            <LinearGradient
              colors={['#D9D9D9', '#6B6B6B', '#000000']}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.avatarCircle}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: t.divider }]}>
                  <User size={50} color={t.placeholder} strokeWidth={1.2} />
                </View>
              )}
            </LinearGradient>
            <View style={[styles.cameraBadge, { backgroundColor: t.card }]}>
              <Camera size={14} color={t.textPrimary} />
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: t.textPrimary }]}>{userName || 'Add your name'}</Text>
            <Text style={[styles.userPhone, { color: t.textSecondary }]}>{phone || 'Add phone number'}</Text>
            <Text style={[styles.userEmail, { color: t.textSecondary }]}>{userEmail || 'Add email address'}</Text>
          </View>
        </View>

        <View style={styles.darkModeRow}>
          <Text style={[styles.darkModeLabel, { color: t.textPrimary }]}>Enable Dark Mode</Text>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: t.border, true: '#4CA1AF' }}
            thumbColor={t.card}
            style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
          />
        </View>

        <View style={styles.menuContainer}>
          {renderMenuGroup(group1, 340)}
          {renderMenuGroup(group2, 200)}
          {renderMenuGroup(group3, 166)}
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { borderColor: t.textPrimary }]} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={20} color={t.textPrimary} />
          <Text style={[styles.logoutText, { color: t.textPrimary }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 36,
    color: '#242424',
    textAlign: 'center',
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  errorText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  avatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 18,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarCircle: {
    width: 129,
    height: 129,
    borderRadius: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 87,
    height: 87,
    borderRadius: 44,
  },
  avatarInner: {
    width: 87,
    height: 87,
    borderRadius: 44,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 23,
    color: '#000000',
    textAlign: 'center',
  },
  userPhone: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 23,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  userEmail: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    lineHeight: 23,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  darkModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 23,
    marginBottom: 18,
  },
  darkModeLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 22,
    color: '#000000',
  },
  menuContainer: {
    gap: 10,
  },
  menuGroup: {
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#6B6B6B',
    padding: 10,
    justifyContent: 'space-between',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  menuIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 26,
    color: '#000000',
  },
  menuChevron: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuSeparator: {
    height: 0.5,
    backgroundColor: '#8F8F8F',
    marginLeft: 58,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 10,
    marginTop: 30,
  },
  logoutText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 23,
    color: '#000000',
    textAlign: 'center',
  },
});
