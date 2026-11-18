import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  PixelImageButton,
  PixelPopupActions,
  PixelPopupButton,
  PixelPopupFrame,
  PixelPopupMessage,
  PixelPopupOverlay,
  PixelPopupTitle,
} from '@/components/pixel-popup';
import { POPUP_COLORS } from '@/constants/pixel-popup';
import { WALKING_REWARD_COINS, WALKING_REWARD_TIERS, WALKING_REWARD_XP, type WalkingReward } from '@/constants/walking-reward';
import { useResponsive } from '@/hooks/use-responsive';

// 처음 들어온 사용자에게 순서대로 보여 주는 설명 팝업 문구.
export const WALKING_INTRO_MESSAGES = [
  `걷기를 진행하면 귤과 XP가 생겨요! 하루에 ${WALKING_REWARD_TIERS.map((tier) => tier.steps.toLocaleString('ko-KR')).join(' · ')}걸음을 넘길 때마다 귤 ${WALKING_REWARD_COINS}개와 XP ${WALKING_REWARD_XP}를 받아요.`,
  '귤은 가치고치 세계의 화폐라 상점에서 쓸 수 있고, XP가 쌓이면 귤새가 자라요. 보상은 날마다 새로 받을 수 있어요!',
];

type WalkingIntroPopupProps = {
  step: number;
  onNext: () => void;
};

export function WalkingIntroPopup({ step, onNext }: WalkingIntroPopupProps) {
  const last = step >= WALKING_INTRO_MESSAGES.length - 1;

  return (
    <PopupShell title={`걷기 안내 ${step + 1}/${WALKING_INTRO_MESSAGES.length}`} message={WALKING_INTRO_MESSAGES[step]}>
      <PixelImageButton kind={last ? 'confirm' : 'next'} onPress={onNext} accessibilityHint={last ? '안내를 닫아요' : '다음 안내로 넘어가요'} />
    </PopupShell>
  );
}

export function WalkingRewardPopup({ reward, onClose }: { reward: WalkingReward; onClose: () => void }) {
  return (
    <PopupShell title="걷기 보상 도착!" message={`귤 ${reward.coins}개, XP ${reward.xp}를 받았어요`}>
      <PixelImageButton kind="confirm" onPress={onClose} />
    </PopupShell>
  );
}

// onBack을 넘기면 팝업 맨 위에 '뒤로가기' 버튼이 생긴다.
export function PopupShell({
  title,
  message,
  onBack,
  media,
  children,
}: {
  title: string;
  message: string;
  onBack?: () => void;
  media?: ReactNode;
  children: ReactNode;
}) {
  const { scale } = useResponsive();

  return (
    <PixelPopupOverlay>
      <PixelPopupFrame>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
            <MaterialIcons name="arrow-back" size={scale(18)} color={POPUP_COLORS.text} />
            <Text style={{ color: POPUP_COLORS.text, fontSize: scale(14), fontWeight: '700' }}>뒤로가기</Text>
          </Pressable>
        ) : null}
        <PixelPopupTitle>{title}</PixelPopupTitle>
        <PixelPopupMessage>{message}</PixelPopupMessage>
        {media}
        <PixelPopupActions>{children}</PixelPopupActions>
      </PixelPopupFrame>
    </PixelPopupOverlay>
  );
}

export function PopupButton({ label, onPress, tone = 'green' }: { label: string; onPress: () => void; tone?: 'green' | 'beige' }) {
  return <PixelPopupButton label={label} onPress={onPress} tone={tone} />;
}

export function PopupSlot({ height }: { height: number }) {
  const { scale } = useResponsive();

  return <View style={{ alignSelf: 'stretch', height: scale(height), backgroundColor: POPUP_COLORS.fillSide, borderWidth: scale(2), borderColor: POPUP_COLORS.fillDark }} />;
}
