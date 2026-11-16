import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { PixelNoticeOptions } from '@/components/pixel-notice';
import { palette } from '@/constants/palette';
import { WALKING_REWARD_COINS, WALKING_REWARD_TIERS, WALKING_REWARD_XP, type WalkingReward } from '@/constants/walking-reward';
import { useResponsive } from '@/hooks/use-responsive';

// 처음 들어온 사용자에게 순서대로 보여 주는 설명 팝업 문구.
export const WALKING_INTRO_MESSAGES = [
  `걷기를 진행하면 귤과 XP가 생겨요! 하루에 ${WALKING_REWARD_TIERS.map((tier) => tier.steps.toLocaleString('ko-KR')).join(' · ')}걸음을 넘길 때마다 귤 ${WALKING_REWARD_COINS}개와 XP ${WALKING_REWARD_XP}를 받아요.`,
  '귤은 가치고치 세계의 화폐라 상점에서 쓸 수 있고, XP가 쌓이면 귤새가 자라요. 보상은 날마다 새로 받을 수 있어요!',
];

export function walkingRewardNotice(reward: WalkingReward): PixelNoticeOptions {
  return { title: '걷기 보상 도착!', message: `귤 ${reward.coins}개, XP ${reward.xp}를 받았어요` };
}

type WalkingIntroPopupProps = {
  step: number;
  onNext: () => void;
};

export function WalkingIntroPopup({ step, onNext }: WalkingIntroPopupProps) {
  const last = step >= WALKING_INTRO_MESSAGES.length - 1;

  return (
    <PopupShell icon="directions-walk" title={`걷기 안내 ${step + 1}/${WALKING_INTRO_MESSAGES.length}`} message={WALKING_INTRO_MESSAGES[step]}>
      <PopupButton label={last ? '시작하기' : '다음'} onPress={onNext} />
    </PopupShell>
  );
}

// 봉그깅 인증 팝업(CertificationPopup)과 비슷한 모양으로 맞춘 틀. 그 파일을 가져다 쓰지 않고 여기서 직접 그린다.
// onBack을 넘기면 팝업 맨 위에 '뒤로가기' 버튼이 생긴다.
export function PopupShell({
  icon,
  title,
  message,
  onBack,
  children,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  message: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const { scale } = useResponsive();

  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: palette.dim, justifyContent: 'center', paddingHorizontal: scale(24) }}>
      <View style={{ backgroundColor: palette.white, borderRadius: scale(24), padding: scale(20), gap: scale(12) }}>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
            <MaterialIcons name="arrow-back" size={scale(18)} color={palette.muted} />
            <Text style={{ color: palette.muted, fontSize: scale(14), fontWeight: '700' }}>뒤로가기</Text>
          </Pressable>
        ) : null}
        <View style={{ width: scale(48), height: scale(48), borderRadius: scale(24), backgroundColor: palette.leafSoft, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name={icon} size={scale(26)} color={palette.leafDeep} />
        </View>
        <Text style={{ fontSize: scale(24), fontWeight: '800', color: palette.ink }}>{title}</Text>
        <Text style={{ color: palette.body, fontSize: scale(15), lineHeight: scale(22) }}>{message}</Text>
        {children}
      </View>
    </View>
  );
}

export function PopupButton({ label, onPress, tone = 'orange' }: { label: string; onPress: () => void; tone?: 'orange' | 'white' }) {
  const { scale } = useResponsive();
  const white = tone === 'white';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ alignSelf: 'stretch', minHeight: scale(52), borderRadius: scale(16), backgroundColor: white ? palette.white : palette.tangerine, alignItems: 'center', justifyContent: 'center', borderWidth: white ? 1 : 0, borderColor: palette.line }}>
      <Text style={{ color: white ? palette.ink : palette.white, fontSize: scale(16), fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}