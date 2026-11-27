import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { usePlayState } from '@/components/play-state';
import { walkColor } from '@/components/walking/walk-assets';
import { WalkPopupFrame } from '@/components/walking/walk-popup-frame';
import { WalkText } from '@/components/walking/walk-text';
import { WalkButton } from '@/components/walking/walk-wide-button';
import { useResponsive } from '@/hooks/use-responsive';

const HOME_HREF = '/(tabs)' as Href;

const COPY = {
  growth: { title: '귤새가 자랄 준비가 됐수다!', body: '섬에 가서 귤새가 크는 모습을 봐 줍서.' },
  island: { title: '섬이 넓어질 준비가 됐수다!', body: '섬에 가서 섬이 커지는 걸 봐 줍서.' },
} as const;

export function WalkHomeInvite({ hidden }: { hidden: boolean }) {
  const { scale } = useResponsive();
  const { homeInvite, dismissHomeInvite } = usePlayState();

  if (!homeInvite || hidden) {
    return null;
  }

  const copy = COPY[homeInvite.kind];

  return (
    <WalkPopupFrame zIndex={70}>
      <WalkText size={15} center>
        {copy.title}
      </WalkText>
      <WalkText size={12} regular center color={walkColor.ink}>
        {copy.body}
      </WalkText>
      <View style={{ alignSelf: 'stretch', gap: scale(8), marginTop: scale(4) }}>
        <WalkButton
          label="섬으로 가게"
          height={40}
          textSize={14}
          onPress={() => {
            dismissHomeInvite();
            router.replace(HOME_HREF);
          }}
        />
        <WalkButton label="호꼼 이따가" tone="beige" height={40} textSize={14} onPress={dismissHomeInvite} />
      </View>
    </WalkPopupFrame>
  );
}
