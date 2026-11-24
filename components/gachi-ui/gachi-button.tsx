import { Image } from 'expo-image';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { gachiUi } from '@/constants/gachi-ui';
import { uiButtons, type UiIconButtonKind } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type ButtonTone = 'green' | 'beige' | 'gray';
type ButtonWidth = 'hug' | 'wide';

type GachiButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ButtonTone;
  /** wide = 시작허게·보상 받게 급 넓은 버튼 */
  width?: ButtonWidth;
  style?: StyleProp<ViewStyle>;
};

/** 글자는 갈무리, 크롬은 에셋 톤에 맞춘 픽셀 버튼 */
export function GachiButton({
  label,
  onPress,
  disabled = false,
  tone = 'green',
  width = 'hug',
  style,
}: GachiButtonProps) {
  const { scale } = useResponsive();
  const height = scale(width === 'wide' ? 24 : 20);
  const minWidth = scale(width === 'wide' ? 180 : 68);
  const padX = scale(width === 'wide' ? 16 : 12);
  const radius = scale(10);
  const border = scale(gachiUi.border);
  const shadow = scale(gachiUi.shadow);

  const face =
    disabled || tone === 'gray'
      ? gachiUi.gray
      : tone === 'beige'
        ? gachiUi.beige
        : gachiUi.green;
  const edge =
    disabled || tone === 'gray'
      ? gachiUi.grayDeep
      : tone === 'beige'
        ? gachiUi.ink
        : gachiUi.greenDeep;
  const drop =
    disabled || tone === 'gray'
      ? gachiUi.grayDeep
      : tone === 'beige'
        ? gachiUi.inkSoft
        : gachiUi.greenShadow;
  const labelColor = tone === 'beige' && !disabled ? gachiUi.ink : gachiUi.white;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={style}>
      {({ pressed }) => {
        // 비활성은 회색만 바꾸고, 그림자는 유지한다. (초록으로 바뀔 때 밑에 줄이 생기던 원인)
        // 눌렀을 때만 그림자를 숨기고 면을 아래로 내린다.
        const sunk = pressed && !disabled;
        return (
          <View
            style={{
              minWidth,
              height: height + shadow,
              justifyContent: 'flex-start',
            }}>
            {sunk ? null : (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: shadow,
                  minWidth,
                  height,
                  borderRadius: radius,
                  backgroundColor: drop,
                }}
              />
            )}
            <View
              style={{
                marginTop: sunk ? shadow : 0,
                minWidth,
                height,
                paddingHorizontal: padX,
                borderRadius: radius,
                borderWidth: border,
                borderColor: edge,
                backgroundColor: face,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <GalmuriText size={width === 'wide' ? 11 : 9} bold color={labelColor} center>
                {label}
              </GalmuriText>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

type GachiIconButtonProps = {
  kind: UiIconButtonKind;
  label: string;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 아이콘이 그림에 들어 있는 사각·원형 버튼 에셋 */
export function GachiIconButton({
  kind,
  label,
  onPress,
  size = 32,
  disabled = false,
  style,
}: GachiIconButtonProps) {
  const { scale } = useResponsive();
  const side = scale(size);

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
        source={uiButtons[kind]}
        style={{ width: side, height: side, ...pixelImageStyle }}
        contentFit="contain"
      />
    </Pressable>
  );
}
