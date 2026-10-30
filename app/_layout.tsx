import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { PlayStateProvider } from '@/components/play-state';
import { palette } from '@/constants/palette';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PlayStateProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.cream },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="home" />
          <Stack.Screen name="index" />
        </Stack>
      </PlayStateProvider>
    </GestureHandlerRootView>
  );
}
