import { Image, type ImageSource } from 'expo-image';
import { Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type AssetImageButtonProps = {
  source: ImageSource;
  label: string;
  /** manifest size(도트) 기준 가로 */
  width: number;
  /** manifest size(도트) 기준 세로 */
  height: number;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 글자가 그림에 박힌 버튼 에셋 (6B) */
export function AssetImageButton({
  source,
  label,
  width,
  height,
  onPress,
  disabled = false,
  style,
}: AssetImageButtonProps) {
  const { scale } = useResponsive();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [{ opacity: pressed || disabled ? 0.75 : 1 }, style]}>
      <Image
        source={source}
        style={{ width: scale(width), height: scale(height), ...pixelImageStyle }}
        contentFit="contain"
      />
    </Pressable>
  );
}
