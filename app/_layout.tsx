import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { FpsMeter } from '@/components/dev/fps-meter';
import { PlayStateProvider } from '@/components/play-state';
import { TutorialProvider } from '@/components/tutorial/tutorial-provider';
import { palette } from '@/constants/palette';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PlayStateProvider>
        <TutorialProvider>
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
          {/* 개발용 FPS 측정기. .env 에 EXPO_PUBLIC_FPS_METER=1 일 때만 보인다 */}
          <FpsMeter />
        </TutorialProvider>
      </PlayStateProvider>
    </GestureHandlerRootView>
  );
}
