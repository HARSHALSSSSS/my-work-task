import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Gift, Printer, ShoppingBag } from 'lucide-react-native';
import { Colors, Typography, Spacing, SCREEN_WIDTH } from '../../constants/theme';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;

type Slide = {
  key: string;
  title: string;
  description: string;
  Icon: typeof Printer;
};

const SLIDES: Slide[] = [
  {
    key: '1',
    title: 'Fast & Reliable Printing',
    description:
      'Upload files, choose options, and get high-quality prints delivered with clear tracking at every step.',
    Icon: Printer,
  },
  {
    key: '2',
    title: 'Personalized Gifting',
    description:
      'Discover curated gifts and add a personal touch—perfect for birthdays, celebrations, and special moments.',
    Icon: Gift,
  },
  {
    key: '3',
    title: 'Shop Stationery & More',
    description:
      'Browse notebooks, art supplies, and everyday essentials—all in one place, ready when you need them.',
    Icon: ShoppingBag,
  },
];

export function OnboardingScreen() {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setIndex(first.index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / SCREEN_WIDTH);
    setIndex(Math.min(Math.max(next, 0), SLIDES.length - 1));
  }, []);

  const handlePrimary = useCallback(() => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
      return;
    }
    setOnboarded(true);
    navigation.navigate('Login');
  }, [index, navigation, setOnboarded]);

  const renderItem: ListRenderItem<Slide> = useCallback(
    ({ item }) => {
      const Icon = item.Icon;
      return (
        <View style={styles.slide}>
          <View style={[styles.iconWrap, { backgroundColor: t.chipBg }]}>
            <Icon size={96} color={t.textPrimary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.title, { color: t.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.description, { color: t.textSecondary }]}>{item.description}</Text>
        </View>
      );
    },
    [],
  );

  const isLast = index === SLIDES.length - 1;

  return (
    <SafeScreen>
      <View style={styles.root}>
        <FlatList
          style={styles.list}
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, i) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * i,
            index: i,
          })}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((resolve) => setTimeout(resolve, 500));
            wait.then(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: true });
            });
          }}
        />
        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.key}
                style={[styles.dot, i === index ? [styles.dotActive, { backgroundColor: t.textPrimary }] : [styles.dotInactive, { backgroundColor: t.placeholder }]]}
              />
            ))}
          </View>
          <Button
            title={isLast ? 'Get Started' : 'Next'}
            onPress={handlePrimary}
            variant="primary"
            size="lg"
          />
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.black,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.gray,
  },
});
