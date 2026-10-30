import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelPanel, PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { ISLAND_HOME } from '@/constants/routes';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export default function CompleteScreen() {
  const { scale } = useResponsive();
  const { claimLocalShopReward } = usePlayState();
  const claimed = useRef(false);

  useEffect(() => {
    if (claimed.current) {
      return;
    }
    claimed.current = true;
    claimLocalShopReward();
  }, [claimLocalShopReward]);

  return (
    <PixelScreen>
      <View style={{ flex: 1, paddingHorizontal: scale(16), paddingBottom: scale(16), justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', marginTop: scale(20), gap: scale(10) }}>
          <View
            style={{
              backgroundColor: pixel.grass,
              borderWidth: scale(2),
              borderColor: pixel.ink,
              paddingHorizontal: scale(12),
              paddingVertical: scale(6),
            }}>
            <PixelText size={13}>10분 함께 놀기 완료!</PixelText>
          </View>
          <PixelSprite id="buddy" size={scale(96)} />
          <PixelText size={18} center>
            로컬 상점 방문 성공
          </PixelText>
        </View>

        <PixelPanel style={{ gap: scale(8) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
              <PixelSprite id="tangerine" size={scale(24)} />
              <PixelText size={22} color={pixel.tangerine}>
                +50 귤
              </PixelText>
            </View>
            <PixelText size={14}>단골 +1</PixelText>
          </View>
          <PixelText size={12} color={pixel.muted}>
            받은 귤로 상점에서 치장 아이템을 사고 섬에 심어 보세요.
          </PixelText>
        </PixelPanel>

        <PixelButton label="섬으로 돌아가기" onPress={() => router.replace(ISLAND_HOME)} />
      </View>
    </PixelScreen>
  );
}
