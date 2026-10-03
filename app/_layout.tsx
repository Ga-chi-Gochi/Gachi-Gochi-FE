import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { PlayStateProvider } from '@/components/play-state';
import { palette } from '@/constants/palette';

export default function RootLayout() {
  return (
    <PlayStateProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.cream },
        }}
      />
    </PlayStateProvider>
  );
}
