import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';

import { usePlayState } from '@/components/play-state';
import { StoreCoinBadge } from '@/components/store-coin-badge';
import { WalkText } from '@/components/walking/walk-text';
import { ISLAND_HOME } from '@/constants/routes';
import { useResponsive } from '@/hooks/use-responsive';
import { snapArt } from '@/lib/pixel-snap';

const BACK_ART_PIXELS = 32;
const BADGE_SHARE = 0.7;
const crispStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

export function StoreHeader() {
  const { scale } = useResponsive();
  const { coins } = usePlayState();
  const back = snapArt(scale(40), BACK_ART_PIXELS);

  return (
    <View
      style={{
        height: back + scale(16),
        paddingHorizontal: scale(16),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
      }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
        <WalkText size={20} center>
          상점
        </WalkText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="섬으로 돌아가기"
        hitSlop={4}
        onPress={() => router.navigate(ISLAND_HOME)}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
        <Image source={require('@/assets/ui/walking/walk-btn-back.png')} style={{ width: back, height: back, ...crispStyle }} contentFit="fill" />
      </Pressable>
      <StoreCoinBadge value={coins} height={Math.round(back * BADGE_SHARE)} />
    </View>
  );
}
