import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/useThemeStore';

interface SafeScreenProps {
  children: React.ReactNode;
  backgroundColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content';
}

export const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  backgroundColor,
  statusBarStyle,
}) => {
  const { colors } = useThemeStore();
  const bg = backgroundColor ?? colors.background;
  const barStyle = statusBarStyle ?? colors.statusBar;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={barStyle} backgroundColor={bg} animated />
      <View style={styles.inner}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
});
