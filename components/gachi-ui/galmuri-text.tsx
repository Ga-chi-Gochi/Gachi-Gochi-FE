import { type ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { gachiUi, galmuri } from '@/constants/gachi-ui';
import { useResponsive } from '@/hooks/use-responsive';

type GalmuriTextProps = {
  children: ReactNode;
  size?: number;
  color?: string;
  bold?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** 갈무리 비트맵 폰트. 기본 11, bold 는 Galmuri11-Bold */
export function GalmuriText({
  children,
  size = 11,
  color = gachiUi.ink,
  bold = false,
  center = false,
  style,
  numberOfLines,
}: GalmuriTextProps) {
  const { scale } = useResponsive();
  const fontFamily = size <= 7 ? galmuri.size7 : size <= 9 ? galmuri.size9 : size >= 14 ? galmuri.size14 : bold ? galmuri.bold : galmuri.regular;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color,
          fontSize: scale(size),
          fontFamily,
          textAlign: center ? 'center' : 'left',
          includeFontPadding: false,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}
