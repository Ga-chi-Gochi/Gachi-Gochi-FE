import { Image } from 'expo-image';
import { useEffect } from 'react';
import { PixelRatio, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { snapArt, walkArt, walkColor, walkPixelImage, walkUi } from '@/components/walking/walk-assets';
import { WALKING_GOAL, WALKING_REWARD_TIERS } from '@/constants/walking-reward';
import { useResponsive } from '@/hooks/use-responsive';

const BAR_ART_WIDTH = 256;
const BAR_ART_HEIGHT = 32;

type WalkProgressProps = {
  steps: number;
  claimedSteps: number[];
  pendingSteps: number[];
  width: number;
};

function px(value: number) {
  return PixelRatio.roundToNearestPixel(value);
}

export function WalkProgress({ steps, claimedSteps, pendingSteps, width }: WalkProgressProps) {
  const { scale } = useResponsive();
  const u = width / BAR_ART_WIDTH;
  const tiers = WALKING_REWARD_TIERS;
  const gap = px(2 * u);
  const frame = px(u);
  const inner = width - frame * 4;
  const full = (inner - gap * tiers.length) / tiers.length;
  const segments = [
    { width: full / 2, from: 0, to: tiers[0].steps },
    ...tiers.slice(1).map((tier, index) => ({ width: full, from: tiers[index].steps, to: tier.steps })),
    { width: full / 2, from: WALKING_GOAL, to: WALKING_GOAL },
  ];
  const markX = (index: number) => frame * 2 + full / 2 + index * (full + gap) + gap / 2;
  const bubble = snapArt(scale(32), walkArt.bubbleSmall);

  return (
    <View style={{ width, alignSelf: 'center' }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="오늘 걸음 진행"
        accessibilityValue={{ min: 0, max: WALKING_GOAL, now: Math.min(steps, WALKING_GOAL) }}
        style={{ height: px(BAR_ART_HEIGHT * u), backgroundColor: walkColor.barOuter, padding: frame }}>
        <View style={{ flex: 1, backgroundColor: walkColor.barLine, padding: frame, flexDirection: 'row', gap }}>
          {segments.map((segment, index) => {
            const ratio = segment.to === segment.from ? (steps >= segment.to ? 1 : 0) : Math.min(1, Math.max(0, (steps - segment.from) / (segment.to - segment.from)));
            return <BarSegment key={index} width={segment.width} ratio={ratio} u={u} />;
          })}
        </View>
      </View>
      <View style={{ height: bubble }}>
        {tiers.map((tier, index) => (
          <View key={tier.steps} style={{ position: 'absolute', left: markX(index) - bubble / 2, top: 0 }}>
            <TierIcon
              steps={tier.steps}
              size={bubble}
              claimed={claimedSteps.includes(tier.steps)}
              pending={pendingSteps.includes(tier.steps)}
              reached={steps >= tier.steps}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function BarSegment({ width, ratio, u }: { width: number; ratio: number; u: number }) {
  const one = px(u);
  const two = px(2 * u);
  const three = px(3 * u);

  return (
    <View style={{ width, backgroundColor: walkColor.barEmpty }}>
      <View style={{ height: two, backgroundColor: walkColor.barEmptyEdge }} />
      <View style={{ height: one, backgroundColor: walkColor.barEmptyMid }} />
      <View style={{ flex: 1 }} />
      <View style={{ height: one, backgroundColor: walkColor.barEmptyMid }} />
      <View style={{ height: three, backgroundColor: walkColor.barEmptyEdge }} />
      {ratio > 0 ? (
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: px(width * ratio), backgroundColor: walkColor.barFill }}>
          <View style={{ height: two, backgroundColor: walkColor.barFillTop }} />
          <View style={{ flex: 1 }} />
          <View style={{ height: two, backgroundColor: walkColor.barFillBottom }} />
          <View style={{ height: one, backgroundColor: walkColor.barFillEdge }} />
        </View>
      ) : null}
    </View>
  );
}

function TierIcon({ steps, size, claimed, pending, reached }: { steps: number; size: number; claimed: boolean; pending: boolean; reached: boolean }) {
  const { scale } = useResponsive();
  const lift = useSharedValue(0);
  const unit = size / walkArt.bubbleSmall;
  const fruit = snapArt(scale(21), walkArt.tangerine);
  const check = snapArt(scale(17), walkArt.check);

  useEffect(() => {
    if (!pending) {
      cancelAnimation(lift);
      lift.value = withTiming(0, { duration: 120 });
      return;
    }
    lift.value = withRepeat(
      withSequence(withTiming(-3, { duration: 260, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) })),
      -1,
    );
    return () => cancelAnimation(lift);
  }, [lift, pending]);

  const fruitStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const state = claimed ? '받음' : pending ? '받을 수 있음' : '아직';

  return (
    <View accessible accessibilityLabel={`${steps}걸음 보상 ${state}`} style={{ width: size, height: size, opacity: reached ? 1 : 0.55 }}>
      <Image source={walkUi.bubbleSmall} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, ...walkPixelImage }} contentFit="fill" />
      <Animated.View style={[{ position: 'absolute', left: (size - fruit) / 2, top: unit * 8.5 - fruit / 2 }, fruitStyle]}>
        <Image source={walkUi.tangerine} style={{ width: fruit, height: fruit, ...walkPixelImage }} contentFit="fill" />
      </Animated.View>
      {claimed ? (
        <Image
          source={walkUi.check}
          style={{ position: 'absolute', right: -unit * 4, top: unit * 1.5, width: check, height: check, ...walkPixelImage }}
          contentFit="fill"
        />
      ) : null}
    </View>
  );
}
