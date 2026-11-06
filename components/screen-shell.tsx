import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

type ScreenShellProps = {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
};

export function ScreenShell({ children, title, showBack = false }: ScreenShellProps) {
  const { scale } = useResponsive();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.cream }}>
      {showBack || title ? (
        <View
          style={{
            minHeight: scale(52),
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: scale(12),
          }}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="뒤로"
              onPress={() => router.back()}
              hitSlop={8}
              style={{
                width: scale(40),
                height: scale(40),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcons name="arrow-back" size={scale(22)} color={palette.ink} />
            </Pressable>
          ) : (
            <View style={{ width: scale(40) }} />
          )}
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              color: palette.ink,
              fontSize: scale(17),
              fontWeight: '700',
            }}>
            {title}
          </Text>
          <View style={{ width: scale(40) }} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}
