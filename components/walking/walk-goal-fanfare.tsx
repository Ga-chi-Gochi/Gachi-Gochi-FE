import { Image } from 'expo-image';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { growthSpriteId, PixelSprite } from '@/components/pixel/pixel-sprite';
import { usePlayState } from '@/components/play-state';
import { snapArt, walkArt, walkColor, walkPixelImage, walkUi } from '@/components/walking/walk-assets';
import { WalkFireworks } from '@/components/walking/walk-fireworks';
import { WalkPopupFrame } from '@/components/walking/walk-popup-frame';
import { WalkRewardCard } from '@/components/walking/walk-reward-popup';
import { WalkText } from '@/components/walking/walk-text';
import { WalkButton } from '@/components/walking/walk-wide-button';
import { WALKING_GOAL, WALKING_REWARD_TIERS } from '@/constants/walking-reward';
import type { WalkingRewardEvent } from '@/hooks/use-walking-reward';
import { useResponsive } from '@/hooks/use-responsive';

export function shouldPlayWalkGoalFanfare(reward: WalkingRewardEvent): boolean {
  return reward.reachedGoal;
}

type WalkGoalFanfareProps = {
  reward: WalkingRewardEvent;
  claimedSteps: number[];
  onDone: () => void;
};

export function WalkGoalFanfare({ reward, claimedSteps, onDone }: WalkGoalFanfareProps) {
  const { scale } = useResponsive();
  const { growthStage } = usePlayState();
  const fruit = snapArt(scale(45), walkArt.tangerine);
  const badgeFruit = snapArt(scale(16), walkArt.tangerine);
  const check = snapArt(scale(17), walkArt.check);
  const today = WALKING_REWARD_TIERS.filter((tier) => claimedSteps.includes(tier.steps)).reduce(
    (sum, tier) => ({ coins: sum.coins + tier.coins, xp: sum.xp + tier.xp }),
    { coins: 0, xp: 0 },
  );
  const stepsLabel = `${WALKING_GOAL} 걸음`;

  return (
    <WalkPopupFrame accent behind={<WalkFireworks />} width={310}>
      <WalkText size={20} center>
        폭삭 속았수다!
      </WalkText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale(6),
          paddingHorizontal: scale(12),
          paddingVertical: scale(5),
          backgroundColor: walkColor.gold,
          borderWidth: scale(2),
          borderColor: walkColor.black,
        }}>
        <Image source={walkUi.tangerine} style={{ width: badgeFruit, height: badgeFruit, ...walkPixelImage }} contentFit="fill" />
        <WalkText size={14}>{`${WALKING_GOAL.toLocaleString('ko-KR')} 걸음 달성`}</WalkText>
      </View>
      <BouncingSprite level={growthStage.level} size={scale(96)} />
      <View style={{ flexDirection: 'row', gap: scale(12) }}>
        <WalkRewardCard label={`귤 ${reward.coins}개`} stepsLabel={stepsLabel}>
          <View style={{ width: fruit, height: fruit }}>
            <Image source={walkUi.tangerine} style={{ width: fruit, height: fruit, ...walkPixelImage }} contentFit="fill" />
            <Image source={walkUi.check} style={{ position: 'absolute', right: -check / 2, bottom: 0, width: check, height: check, ...walkPixelImage }} contentFit="fill" />
          </View>
        </WalkRewardCard>
        <WalkRewardCard stepsLabel={stepsLabel}>
          <WalkText size={20} center>
            +{reward.xp} XP
          </WalkText>
        </WalkRewardCard>
      </View>
      <View style={{ gap: scale(4) }}>
        <WalkText size={11} center>
          {`오늘 모은 보상: 귤 ${today.coins}개 · XP ${today.xp}`}
        </WalkText>
        <WalkText size={11} center>
          오늘 걸은 만큼 제주가 더 맑아졌수다.
        </WalkText>
      </View>
      <WalkButton label="고맙수다!" tone="gold" onPress={onDone} width={scale(150)} height={38} textSize={14} />
    </WalkPopupFrame>
  );
}

function BouncingSprite({ level, size }: { level: number; size: number }) {
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = withRepeat(
      withSequence(withTiming(-8, { duration: 320, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })),
      -1,
    );
    return () => cancelAnimation(lift);
  }, [lift]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  return (
    <Animated.View style={style}>
      <PixelSprite id={growthSpriteId(level)} size={size} />
    </Animated.View>
  );
}
