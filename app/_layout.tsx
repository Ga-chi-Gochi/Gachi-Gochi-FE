import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { FpsMeter } from '@/components/dev/fps-meter';
import { PlayStateProvider } from '@/components/play-state';
import { ProgressHomeInvite } from '@/components/progression/progress-home-invite';
import { TutorialProvider } from '@/components/tutorial/tutorial-provider';
import { palette } from '@/constants/palette';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Galmuri7: require('@/assets/fonts/Galmuri7.ttf'),
    Galmuri9: require('@/assets/fonts/Galmuri9.ttf'),
    Galmuri11: require('@/assets/fonts/Galmuri11.ttf'),
    'Galmuri11-Bold': require('@/assets/fonts/Galmuri11-Bold.ttf'),
    Galmuri14: require('@/assets/fonts/Galmuri14.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

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
          <ProgressHomeInvite />
          {/* 개발용 FPS 측정기. .env 에 EXPO_PUBLIC_FPS_METER=1 일 때만 보인다 */}
          <FpsMeter />
        </TutorialProvider>
      </PlayStateProvider>
    </GestureHandlerRootView>
  );
}
