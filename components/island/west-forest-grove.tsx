import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PixelSprite } from '@/components/pixel/pixel-sprite';

export type WestForestTree = {
  gx: number;
  gy: number;
  size: number;
};

/** 서쪽 풀숲 — 해금 직후 자라나는 연출, 이후 고정 */
export const WEST_FOREST_TREES: WestForestTree[] = [
  { gx: 3.0, gy: 5.9, size: 20 },
  { gx: 3.6, gy: 6.4, size: 26 },
  { gx: 4.2, gy: 5.8, size: 18 },
  { gx: 4.7, gy: 6.7, size: 24 },
  { gx: 3.3, gy: 7.2, size: 22 },
  { gx: 4.0, gy: 7.7, size: 17 },
  { gx: 4.9, gy: 7.5, size: 21 },
  { gx: 5.3, gy: 8.0, size: 16 },
  { gx: 3.8, gy: 8.2, size: 15 },
  { gx: 5.1, gy: 6.2, size: 19 },
];

type WestForestGroveProps = {
  mapW: number;
  mapH: number;
  cellW: number;
  cellH: number;
  playGrow: boolean;
  sizePx: (size: number) => number;
};

export function WestForestGrove({ mapW, mapH, cellW, cellH, playGrow, sizePx }: WestForestGroveProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: mapW,
        height: mapH,
      }}>
      {WEST_FOREST_TREES.map((tree, index) => (
        <GrowingTree
          key={`west-tree-${index}`}
          tree={tree}
          cellW={cellW}
          cellH={cellH}
          delayMs={index * 85}
          playGrow={playGrow}
          pixelSize={sizePx(tree.size)}
        />
      ))}
    </View>
  );
}

function GrowingTree({
  tree,
  cellW,
  cellH,
  delayMs,
  playGrow,
  pixelSize,
}: {
  tree: WestForestTree;
  cellW: number;
  cellH: number;
  delayMs: number;
  playGrow: boolean;
  pixelSize: number;
}) {
  const grow = useSharedValue(playGrow ? 0.08 : 1);

  useEffect(() => {
    if (!playGrow) {
      grow.value = 1;
      return;
    }
    grow.value = 0.08;
    grow.value = withDelay(
      delayMs,
      withSequence(
        withTiming(1.14, { duration: 420, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [delayMs, grow, playGrow]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: grow.value }],
    opacity: grow.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: tree.gx * cellW - pixelSize / 2,
          top: tree.gy * cellH - pixelSize / 2,
        },
        style,
      ]}>
      <PixelSprite id="tree" size={pixelSize} />
    </Animated.View>
  );
}
