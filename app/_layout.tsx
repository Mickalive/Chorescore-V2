/**
 * ChoreScore V2 — Root Layout
 *
 * Expo Router root layout with warm theme and app context.
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/ui/design-system/theme';
import { AppProvider } from '../src/features/app/AppContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="household/[id]" />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
