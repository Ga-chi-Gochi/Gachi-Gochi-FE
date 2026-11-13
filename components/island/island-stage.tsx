import { useEffect } from 'react';
import { PixelRatio, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { IslandMap } from '@/components/island/island-map';
import { PlaceGuideBanner } from '@/components/island/place-mode';
import { PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { getShopItem } from '@/constants/content';
import { ISLAND_ZONES } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type IslandStageProps = {
  /** 집 버튼을 누를 때마다 증가. 섬이 짧게 통통 튄다 */
  bounce?: number;
};

export function IslandStage({ bounce = 0 }: IslandStageProps) {
  const { factor, scale } = useResponsive();
  const { zoneUnlockReveal, pendingPlaceItemId, cancelPlacing } = usePlayState();
  const shift = useSharedValue(0);

  const pendingItem = pendingPlaceItemId ? getShopItem(pendingPlaceItemId) : null;
  const preferredName = pendingItem?.preferredZone
    ? ISLAND_ZONES.find((z) => z.id === pendingItem.preferredZone)?.name
    : undefined;

  useEffect(() => {
    if (!bounce) return;
    const distance = PixelRatio.roundToNearestPixel(4 * factor);
    shift.value = withSequence(withTiming(-distance, { duration: 90 }), withSpring(0, { damping: 9, stiffness: 240 }));
  }, [bounce, factor, shift]);

  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shift.value }],
  }));

  return (
    <View style={{ flex: 1, paddingHorizontal: scale(12), paddingBottom: scale(96), gap: scale(8) }}>
      {pendingPlaceItemId ? (
        <PlaceGuideBanner itemId={pendingPlaceItemId} preferredZoneName={preferredName} onCancel={cancelPlacing} />
      ) : null}

      <Animated.View style={[{ flex: 1, minHeight: scale(280), justifyContent: 'center' }, stageStyle]}>
        <IslandMap highlightZoneId={zoneUnlockReveal?.zoneId ?? null} />
      </Animated.View>

      {pendingPlaceItemId ? (
        <PixelText size={14} weight="500" color={pixel.muted} center>
          추천 구역이 더 밝게 반짝여요. 잠긴 땅은 섬을 넓히면 열려요.
        </PixelText>
      ) : null}
    </View>
  );
}
