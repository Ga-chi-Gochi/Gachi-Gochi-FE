import { Image } from 'expo-image';
import { View } from 'react-native';

import { PixelText } from '@/components/pixel/pixel-ui';
import { palette } from '@/constants/palette';
import { pixel } from '@/constants/pixel-theme';
import { WALKING_GOAL_STEPS, WALKING_REWARD_TIERS, type WalkingRewardTier } from '@/constants/walking-reward';
import { useResponsive } from '@/hooks/use-responsive';

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

export function WalkingRewardBoard({ steps, claimedSteps, coins }: { steps: number; claimedSteps: number[]; coins: number }) {
  const { scale } = useResponsive();
  const progress = Math.min(1, Math.max(0, steps / WALKING_GOAL_STEPS));

  return (
    <View style={{ backgroundColor: palette.line, padding: scale(16), gap: scale(14) }}>
      <View style={{ gap: scale(6) }}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="오늘 걸음 진행"
          accessibilityValue={{ min: 0, max: WALKING_GOAL_STEPS, now: Math.min(steps, WALKING_GOAL_STEPS) }}
          style={{ height: scale(16), borderWidth: scale(2), borderColor: pixel.ink, backgroundColor: pixel.white }}>
          <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: pixel.tangerine }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <PixelText size={11} color={pixel.muted}>0걸음</PixelText>
          <PixelText size={11} color={pixel.muted}>{formatNumber(WALKING_GOAL_STEPS)}걸음</PixelText>
        </View>
      </View>
      <PixelText size={16} center>이만큼 획득했수다!</PixelText>
      <View style={{ flexDirection: 'row', gap: scale(10) }}>
        {WALKING_REWARD_TIERS.map((tier) => (
          <RewardSlot key={tier.steps} tier={tier} claimed={claimedSteps.includes(tier.steps)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: scale(2), borderColor: pixel.ink, paddingTop: scale(12) }}>
        <PixelText size={14}>내 귤코인</PixelText>
        <PixelText size={14}>총 {formatNumber(coins)}개</PixelText>
      </View>
    </View>
  );
}

function RewardSlot({ tier, claimed }: { tier: WalkingRewardTier; claimed: boolean }) {
  const { scale } = useResponsive();

  return (
    <View
      accessibilityLabel={`${formatNumber(tier.steps)}걸음 보상 귤 ${tier.coins}개, ${claimed ? '받음' : '아직 못 받음'}`}
      style={{ flex: 1, alignItems: 'center', gap: scale(6), opacity: claimed ? 1 : 0.45 }}>
      <View
        style={{
          alignSelf: 'stretch',
          alignItems: 'center',
          gap: scale(4),
          paddingVertical: scale(10),
          backgroundColor: claimed ? palette.tangerineSoft : pixel.white,
          borderWidth: scale(claimed ? pixel.border : 2),
          borderColor: claimed ? pixel.tangerine : pixel.ash,
        }}>
        <Image source={require('@/assets/pixel/icon-tangerine.png')} style={{ width: scale(32), height: scale(32) }} contentFit="contain" />
        <PixelText size={13}>{tier.coins}개</PixelText>
      </View>
      <PixelText size={11} color={pixel.muted}>{formatNumber(tier.steps)} 걸음</PixelText>
    </View>
  );
}
