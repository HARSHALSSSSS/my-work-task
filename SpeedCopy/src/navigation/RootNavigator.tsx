import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { AppNavigator } from './AppNavigator';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isAuthenticated, hasOnboarded } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!isAuthenticated ? (
        <>
          {!hasOnboarded && (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )}
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : (
        <Stack.Screen name="App" component={AppNavigator} />
      )}
    </Stack.Navigator>
  );
}
