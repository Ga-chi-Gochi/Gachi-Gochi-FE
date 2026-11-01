import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GrowthCreatureSprite, PixelSprite } from '@/components/pixel/pixel-sprite';
import { exploreGochiLevel } from '@/constants/explore';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type ExploreWaitingAnimProps = {
  gochiId: string | null | undefined;
  /** full: 탐험 화면 / map: 섬 서쪽 풀숲 위 미니 수색 */
  variant?: 'full' | 'map';
};

/**
 * 풀숲 뒤지기 — 나무가 흔들리고 고치가 수풀 사이로 오가며 수색.
 */
export function ExploreWaitingAnim({ gochiId, variant = 'full' }: ExploreWaitingAnimProps) {
  const { scale } = useResponsive();
  const full = variant === 'full';
  const boxW = full ? scale(180) : scale(72);
  const boxH = full ? scale(180) : scale(64);
  const treeSize = full ? scale(48) : scale(22);
  const creatureSize = full ? scale(36) : scale(16);
  const level = exploreGochiLevel(gochiId);

  const peekX = useSharedValue(0);
  const bob = useSharedValue(0);
  const swayL = useSharedValue(0);
  const swayR = useSharedValue(0);
  const leaf = useSharedValue(0);
  const [pose, setPose] = useState<'walk-a' | 'walk-b'>('walk-a');
  const [facing, setFacing] = useState<'left' | 'right'>('right');

  useEffect(() => {
    const leftX = full ? scale(28) : scale(8);
    const rightX = full ? scale(100) : scale(36);
    peekX.value = leftX;
    peekX.value = withRepeat(
      withSequence(
        withTiming(rightX, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(leftX, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    bob.value = withRepeat(
      withSequence(
        withTiming(-2.5, { duration: 160 }),
        withTiming(0, { duration: 160 }),
      ),
      -1,
      true,
    );
    swayL.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 520, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 520, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    swayR.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 480, easing: Easing.inOut(Easing.sin) }),
        withTiming(-5, { duration: 480, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    leaf.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }),
        withDelay(400, withTiming(0, { duration: 280 })),
        withTiming(0, { duration: 500 }),
      ),
      -1,
      false,
    );
  }, [bob, full, leaf, peekX, scale, swayL, swayR]);

  useEffect(() => {
    const poseTimer = setInterval(() => {
      setPose((current) => (current === 'walk-a' ? 'walk-b' : 'walk-a'));
    }, 200);
    const faceTimer = setInterval(() => {
      setFacing((current) => (current === 'right' ? 'left' : 'right'));
    }, 1100);
    return () => {
      clearInterval(poseTimer);
      clearInterval(faceTimer);
    };
  }, []);

  const creatureStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: peekX.value }, { translateY: bob.value }],
  }));
  const treeLStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swayL.value}deg` }],
  }));
  const treeRStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swayR.value}deg` }],
  }));
  const leafStyle = useAnimatedStyle(() => ({
    opacity: leaf.value * 0.85,
    transform: [{ translateY: -leaf.value * (full ? 14 : 6) }, { scale: 0.7 + leaf.value * 0.4 }],
  }));

  return (
    <View
      style={{
        width: boxW,
        height: boxH,
        borderWidth: full ? scale(pixel.border) : 0,
        borderColor: pixel.ink,
        backgroundColor: full ? pixel.grass : 'transparent',
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[
          { position: 'absolute', left: full ? scale(10) : 0, top: full ? scale(36) : scale(4) },
          treeLStyle,
        ]}>
        <PixelSprite id="tree" size={treeSize} />
      </Animated.View>
      <Animated.View
        style={[
          { position: 'absolute', right: full ? scale(12) : 0, top: full ? scale(28) : scale(2) },
          treeRStyle,
        ]}>
        <PixelSprite id="tree" size={full ? scale(52) : scale(24)} />
      </Animated.View>
      {full ? (
        <Animated.View
          style={[
            { position: 'absolute', left: scale(70), top: scale(48), opacity: 0.85 },
            treeRStyle,
          ]}>
          <PixelSprite id="tree" size={scale(34)} />
        </Animated.View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: full ? scale(40) : scale(8),
            left: full ? scale(72) : scale(22),
            width: scale(full ? 10 : 5),
            height: scale(full ? 10 : 5),
            borderRadius: scale(999),
            backgroundColor: pixel.leaf,
          },
          leafStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: full ? scale(52) : scale(12),
            left: full ? scale(88) : scale(30),
            width: scale(full ? 8 : 4),
            height: scale(full ? 8 : 4),
            borderRadius: scale(999),
            backgroundColor: pixel.sand,
          },
          leafStyle,
        ]}
      />

      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: full ? scale(18) : scale(2),
            left: 0,
            zIndex: 2,
          },
          creatureStyle,
        ]}>
        <GrowthCreatureSprite level={level} size={creatureSize} pose={pose} facing={facing} />
      </Animated.View>
    </View>
  );
}
