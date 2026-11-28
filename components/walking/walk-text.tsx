import { type ReactNode } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';

import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { walkColor } from '@/components/walking/walk-assets';
import { galmuri } from '@/constants/gachi-ui';

type WalkTextProps = {
  children: ReactNode;
  size: number;
  color?: string;
  center?: boolean;
  regular?: boolean;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
};

export function WalkText({ children, size, color = walkColor.ink, center = false, regular = false, numberOfLines, style }: WalkTextProps) {
  return (
    <GalmuriText
      size={size}
      bold={!regular}
      color={color}
      center={center}
      numberOfLines={numberOfLines}
      style={[{ fontFamily: regular ? galmuri.regular : galmuri.bold }, style]}>
      {children}
    </GalmuriText>
  );
}
