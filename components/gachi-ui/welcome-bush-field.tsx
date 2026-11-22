import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Platform, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

const bushTile = require('@/assets/images/beach/grass-lawn.png');

/** 와이어 모래 톤 */
const SAND = '#E2CFA8';

type WelcomeBushFieldProps = {
  style?: StyleProp<ViewStyle>;
};

/** 와이어 웰컴 가운데: 모래 위 작은 덤불 격자 */
export function WelcomeBushField({ style }: WelcomeBushFieldProps) {
  const { scale } = useResponsive();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const bushCell = scale(28);
  const step = scale(56);

  const bushes = useMemo(() => {
    if (size.width <= 0 || size.height <= 0) {
      return [] as { key: string; left: number; top: number }[];
    }
    const cols = Math.ceil(size.width / step) + 1;
    const rows = Math.ceil(size.height / step) + 1;
    const next: { key: string; left: number; top: number }[] = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if ((row + col) % 2 !== 0) {
          continue;
        }
        next.push({
          key: `${row}-${col}`,
          left: col * step + (row % 2 === 0 ? 0 : step * 0.2),
          top: row * step + scale(4),
        });
      }
    }
    return next;
  }, [scale, size.height, size.width, step]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: SAND }, style]} onLayout={onLayout}>
      {bushes.map((bush) => (
        <Image
          key={bush.key}
          source={bushTile}
          style={{
            position: 'absolute',
            left: bush.left,
            top: bush.top,
            width: bushCell,
            height: bushCell,
            opacity: 0.9,
            ...pixelImageStyle,
          }}
          contentFit="fill"
        />
      ))}
    </View>
  );
}
