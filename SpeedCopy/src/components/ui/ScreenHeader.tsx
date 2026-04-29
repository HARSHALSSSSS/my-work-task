import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Typography, Spacing } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, rightElement }) => {
  const { colors: t } = useThemeStore();
  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.sideSlot} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideSlot} />
      )}
      <Text style={[styles.title, { color: t.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.sideSlot}>{rightElement}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 12,
    minHeight: 52,
  },
  sideSlot: {
    width: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
  },
});
