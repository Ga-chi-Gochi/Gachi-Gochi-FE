import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { snapArt, walkArt, walkColor, walkPixelImage, walkUi } from '@/components/walking/walk-assets';
import { WalkPopupFrame } from '@/components/walking/walk-popup-frame';
import { WalkText } from '@/components/walking/walk-text';
import { WalkButton } from '@/components/walking/walk-wide-button';
import { useResponsive } from '@/hooks/use-responsive';

type WalkRewardPopupProps = {
  coins: number;
  xp: number;
  steps: number;
  onConfirm: () => void;
};

export function WalkRewardPopup({ coins, xp, steps, onConfirm }: WalkRewardPopupProps) {
  const { scale } = useResponsive();
  const fruit = snapArt(scale(45), walkArt.tangerine);
  const check = snapArt(scale(17), walkArt.check);
  const stepsLabel = `${steps} 걸음`;

  return (
    <WalkPopupFrame>
      <WalkText size={13} center>
        고생했수다! 보상 드리쿠다
      </WalkText>
      <View style={{ flexDirection: 'row', gap: scale(12) }}>
        <WalkRewardCard label={`귤 ${coins}개`} stepsLabel={stepsLabel}>
          <View style={{ width: fruit, height: fruit }}>
            <Image source={walkUi.tangerine} style={{ width: fruit, height: fruit, ...walkPixelImage }} contentFit="fill" />
            <Image source={walkUi.check} style={{ position: 'absolute', right: -check / 2, bottom: 0, width: check, height: check, ...walkPixelImage }} contentFit="fill" />
          </View>
        </WalkRewardCard>
        <WalkRewardCard stepsLabel={stepsLabel}>
          <WalkText size={20} center>
            +{xp} XP
          </WalkText>
        </WalkRewardCard>
      </View>
      <WalkButton label="확인했수다" onPress={onConfirm} width={scale(120)} height={34} textSize={12} />
    </WalkPopupFrame>
  );
}

export function WalkRewardCard({ children, label, stepsLabel }: { children: ReactNode; label?: string; stepsLabel: string }) {
  const { scale } = useResponsive();

  return (
    <View style={{ width: scale(96), height: scale(124), borderWidth: scale(2), borderColor: walkColor.black, backgroundColor: walkColor.card }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(4), paddingTop: scale(4) }}>
        {children}
        {label ? (
          <WalkText size={11} center>
            {label}
          </WalkText>
        ) : null}
      </View>
      <View style={{ height: scale(2), marginHorizontal: scale(6), backgroundColor: walkColor.barEmptyEdge }} />
      <View style={{ height: scale(26), alignItems: 'center', justifyContent: 'center' }}>
        <WalkText size={9} center color={walkColor.grayText}>
          {stepsLabel}
        </WalkText>
      </View>
    </View>
  );
}
