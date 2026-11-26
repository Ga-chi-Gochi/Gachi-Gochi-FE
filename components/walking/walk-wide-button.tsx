import { Pressable, View } from 'react-native';

import { walkColor } from '@/components/walking/walk-assets';
import { WalkText } from '@/components/walking/walk-text';
import { useResponsive } from '@/hooks/use-responsive';

const TONES = {
  green: { fill: walkColor.green, shade: walkColor.greenShadow, text: walkColor.white },
  beige: { fill: walkColor.beige, shade: walkColor.beigeShadow, text: walkColor.beigeText },
  gold: { fill: walkColor.gold, shade: walkColor.goldShadow, text: walkColor.ink },
  gray: { fill: walkColor.gray, shade: walkColor.grayText, text: walkColor.grayText },
} as const;

type WalkButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: 'green' | 'beige' | 'gold';
  width?: number;
  height?: number;
  textSize?: number;
};

export function WalkButton({ label, onPress, disabled = false, tone = 'green', width, height = 47, textSize = 16 }: WalkButtonProps) {
  const { scale } = useResponsive();
  const colors = TONES[disabled ? 'gray' : tone];
  const border = scale(2);
  const shade = scale(4);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ width, alignSelf: width ? 'center' : 'stretch', transform: [{ translateY: pressed ? shade / 2 : 0 }] })}>
      {({ pressed }) => (
        <View
          style={{
            height: scale(height),
            borderWidth: border,
            borderColor: walkColor.black,
            backgroundColor: colors.fill,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: pressed ? shade / 2 : shade, backgroundColor: colors.shade }} />
          <WalkText size={textSize} center color={colors.text}>
            {label}
          </WalkText>
        </View>
      )}
    </Pressable>
  );
}
