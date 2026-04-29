import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift } from 'lucide-react-native';
import { Gradients, Spacing } from '../../constants/theme';

const cardPrintingImg = require('../../../assets/card-printing.png');
const cardGiftingImg = require('../../../assets/card-gifting.png');
const cardShoppingImg = require('../../../assets/card-shopping.png');
import { GradientCard } from '../../components/ui/GradientCard';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { SpeedCopyLogo } from '../../components/ui/SpeedCopyLogo';
import { AppTabParamList, HomeTabStackParamList } from '../../navigation/types';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useThemeStore } from '../../store/useThemeStore';

type CategoryHubNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeTabStackParamList, 'CategoryHub'>,
  BottomTabNavigationProp<AppTabParamList>
>;

export const CategoryHubScreen: React.FC = () => {
  const navigation = useNavigation<CategoryHubNavigationProp>();
  const setMode = useCategoryStore((s) => s.setMode);
  const { colors: t } = useThemeStore();

  useFocusEffect(
    useCallback(() => {
      setMode('home');
    }, [setMode]),
  );

  return (
    <SafeScreen>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <SpeedCopyLogo size="sm" />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ProfileTab', { screen: 'ReferEarn', params: { from: 'home' } })}
            style={styles.referShadow}
          >
            <LinearGradient
              colors={Gradients.refer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.referBtn}
            >
              <Gift size={14} color="#FFFFFF" />
              <Text style={styles.referText}>Refer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.headingWrap}>
          <Text style={[styles.heading, { color: t.textPrimary }]}>What Do you want today ?</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>Select a service to get started.</Text>
        </View>

        <View style={styles.cards}>
          <GradientCard
            title="Printing"
            subtitle="Documents, Flyers & Business Cards"
            colors={Gradients.printing}
            onPress={() => { setMode('printing'); navigation.navigate('PrintingCategories'); }}
            image={cardPrintingImg}
          />
          <GradientCard
            title="Gifting"
            subtitle={'Personalized mugs, Cushions\n& Frames'}
            colors={Gradients.gifting}
            onPress={() => { setMode('gifting'); navigation.navigate('GiftTab', { screen: 'GiftStore' }); }}
            image={cardGiftingImg}
          />
          <GradientCard
            title="Shopping"
            subtitle={'Stationery, Art Supplies\n& Essentials'}
            colors={['#E17AD9', '#A283C7']}
            onPress={() => { setMode('shopping'); navigation.navigate('ShopByCategory'); }}
            image={cardShoppingImg}
            imageStyle={{ width: 118, height: 92 }}
          />
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginBottom: 4,
  },
  referShadow: {
    borderRadius: 8,
    ...Platform.select({
      ios: { shadowColor: '#DD2476', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  referBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  referText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  headingWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    gap: 4,
  },
  heading: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    lineHeight: 30,
    color: '#000000',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    lineHeight: 22,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  cards: {
    gap: 16,
  },
});

