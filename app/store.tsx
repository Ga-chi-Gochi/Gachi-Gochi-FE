import { router } from 'expo-router';
import { View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelChip, PixelPanel, PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { TopBar } from '@/components/top-bar';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export default function StoreScreen() {
  const { scale } = useResponsive();

  return (
    <PixelScreen>
      <TopBar title="로컬 상점 방문" />
      <View style={{ flex: 1, paddingHorizontal: scale(16), paddingBottom: scale(16), justifyContent: 'space-between' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(12) }}>
          <PixelSprite id="house" size={scale(96)} />
          <PixelChip label="도토리숲" bg={pixel.sand} />
          <PixelText size={13} color={pixel.muted} center>
            지도 속 로컬 상점이에요. (픽셀 플레이스홀더 · 기디 에셋 교체 가능)
          </PixelText>
        </View>

        <PixelPanel style={{ gap: scale(12) }}>
          <PixelText size={20}>여기가 맞나요?</PixelText>
          <PixelText size={13} color={pixel.muted}>
            카페 · 120m · 영업 중 · 탐나는전 가맹점
          </PixelText>
          <View style={{ flexDirection: 'row', gap: scale(8) }}>
            <View style={{ flex: 1 }}>
              <PixelButton label="다른 곳이에요" tone="ghost" onPress={() => router.back()} />
            </View>
            <View style={{ flex: 1 }}>
              <PixelButton label="맞아요" onPress={() => router.push('/stay')} />
            </View>
          </View>
        </PixelPanel>
      </View>
    </PixelScreen>
  );
}
