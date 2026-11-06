import { View } from 'react-native';

import { VolcanoBurst } from '@/components/island/volcano-burst';
import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import type { ZoneUnlockReveal } from '@/components/play-state';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function ZoneUnlockRevealOverlay({
  reveal,
  onDone,
}: {
  reveal: ZoneUnlockReveal;
  onDone: () => void;
}) {
  const { scale } = useResponsive();

  if (reveal.volcanoBurst) {
    return <VolcanoBurst zoneName={reveal.zoneName} onDone={onDone} />;
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 45,
        backgroundColor: 'rgba(26,21,32,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(24),
      }}>
      <PixelPanel style={{ width: '100%', maxWidth: scale(320), alignItems: 'center', gap: scale(10) }}>
        <PixelSprite id="island" size={scale(72)} />
        <PixelText size={20} center>
          새 땅이 생겼어요!
        </PixelText>
        <PixelText size={14} center>
          {reveal.zoneName}
        </PixelText>
        <PixelText size={13} color={pixel.muted} center>
          섬이 한 단계 넓어졌어요. 인벤토리에서 아이템을 심어 보세요.
        </PixelText>
        <View style={{ alignSelf: 'stretch' }}>
          <PixelButton label="확인" onPress={onDone} />
        </View>
      </PixelPanel>
    </View>
  );
}
