import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as ExpoSplash from 'expo-splash-screen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { useAuthStore } from './src/store/useAuthStore';
import { AppErrorBoundary } from './src/components/system/AppErrorBoundary';
import { useSocketInit } from './src/hooks/useSocket';
import { useThemeStore } from './src/store/useThemeStore';

ExpoSplash.preventAutoHideAsync().catch(() => {});

export default function App() {
  const { colors: t } = useThemeStore();
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      ExpoSplash.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    useAuthStore.getState().restoreSession();
  }, []);

  const onSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={[styles.loading, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.textPrimary} />
      </View>
    );
  }

  if (showSplash) {
    return <SplashScreen onFinish={onSplashFinish} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <NavigationContainer>
            <AppWithSocket />
          </NavigationContainer>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppWithSocket() {
  useSocketInit();
  return <RootNavigator />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
