import { type ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function PixelScreen({ children, sky = true }: { children: ReactNode; sky?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: sky ? pixel.sky : pixel.paper }}>
      {sky ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            left: 0,
            height: '42%',
            backgroundColor: pixel.skyDeep,
            opacity: 0.35,
          }}
        />
      ) : null}
      <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
    </View>
  );
}

export function PixelPanel({
  children,
  style,
  tone = 'panel',
}: {
  children: ReactNode;
  style?: ViewStyle;
  tone?: 'panel' | 'dark' | 'lava';
}) {
  const { scale } = useResponsive();
  const backgroundColor = tone === 'dark' ? pixel.ink : tone === 'lava' ? pixel.lavaDeep : pixel.panel;
  return (
    <View
      style={[
        {
          backgroundColor,
          borderWidth: scale(pixel.border),
          borderColor: pixel.ink,
          padding: scale(12),
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function PixelText({
  children,
  size = 14,
  color = pixel.ink,
  center,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  center?: boolean;
}) {
  const { scale } = useResponsive();
  return (
    <Text
      style={{
        color,
        fontSize: scale(size),
        fontWeight: '800',
        letterSpacing: 0.4,
        textAlign: center ? 'center' : 'left',
      }}>
      {children}
    </Text>
  );
}

export function PixelButton({
  label,
  onPress,
  disabled,
  tone = 'orange',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'orange' | 'green' | 'ghost';
}) {
  const { scale } = useResponsive();
  const backgroundColor = disabled
    ? pixel.ash
    : tone === 'green'
      ? pixel.leaf
      : tone === 'ghost'
        ? pixel.white
        : pixel.tangerine;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: scale(44),
        paddingHorizontal: scale(14),
        paddingVertical: scale(10),
        backgroundColor,
        borderWidth: scale(pixel.border),
        borderColor: pixel.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <PixelText size={13} color={tone === 'ghost' && !disabled ? pixel.ink : pixel.white}>
        {label}
      </PixelText>
    </Pressable>
  );
}

export function PixelChip({ label, color = pixel.ink, bg = pixel.white }: { label: string; color?: string; bg?: string }) {
  const { scale } = useResponsive();
  return (
    <View
      style={{
        backgroundColor: bg,
        borderWidth: scale(2),
        borderColor: pixel.ink,
        paddingHorizontal: scale(8),
        paddingVertical: scale(3),
      }}>
      <PixelText size={11} color={color}>
        {label}
      </PixelText>
    </View>
  );
}
