import { View } from 'react-native';

import { IslandMap } from '@/components/island/island-map';
import { PlaceGuideBanner } from '@/components/island/place-mode';
import { PixelButton, PixelChip, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { getShopItem } from '@/constants/content';
import { getNextExpandZone, ISLAND_ZONES } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function IslandStage() {
  const { scale } = useResponsive();
  const {
    growthStage,
    islandStage,
    islandStageMax,
    canExpand,
    unlockedZones,
    xp,
    growCreature,
    expandIsland,
    zoneUnlockReveal,
    pendingPlaceItemId,
    cancelPlacing,
  } = usePlayState();

  const next = getNextExpandZone(unlockedZones);
  const pendingItem = pendingPlaceItemId ? getShopItem(pendingPlaceItemId) : null;
  const preferredName = pendingItem?.preferredZone
    ? ISLAND_ZONES.find((z) => z.id === pendingItem.preferredZone)?.name
    : undefined;

  return (
    <View style={{ flex: 1, paddingHorizontal: scale(12), gap: scale(8) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <PixelChip label={`레벨 ${growthStage.level} · ${growthStage.label}`} bg={pixel.white} />
        <PixelChip label={`섬 ${islandStage}/${islandStageMax}단계`} bg={pixel.sand} />
      </View>

      {pendingPlaceItemId ? (
        <PlaceGuideBanner
          itemId={pendingPlaceItemId}
          preferredZoneName={preferredName}
          onCancel={cancelPlacing}
        />
      ) : null}

      <View style={{ flex: 1, minHeight: scale(280), justifyContent: 'center' }}>
        <IslandMap highlightZoneId={zoneUnlockReveal?.zoneId ?? null} />
      </View>

      {!pendingPlaceItemId ? (
        <>
          <View style={{ flexDirection: 'row', gap: scale(8) }}>
            <View style={{ flex: 1 }}>
              <PixelButton label="🌱 키우기" tone="green" onPress={() => void growCreature()} />
            </View>
            <View style={{ flex: 1 }}>
              <PixelButton
                label={canExpand ? '🌋 섬 넓히기' : next ? '섬 넓히기' : '섬 최대'}
                disabled={!canExpand}
                onPress={() => {
                  expandIsland();
                }}
              />
            </View>
          </View>

          <PixelText size={11} color={pixel.muted} center>
            {canExpand
              ? `준비됨 · ${next?.name ?? ''}을(를) 열어보세요`
              : next
                ? `다음: ${next.name} (XP ${next.unlockXp}+ · Lv.${next.minLevel}+) · 현재 XP ${xp}`
                : '모든 땅이 열렸어요'}
          </PixelText>
        </>
      ) : (
        <PixelText size={11} color={pixel.muted} center>
          추천 구역이 더 밝게 반짝여요. 잠긴 땅은 섬을 넓히면 열려요.
        </PixelText>
      )}
    </View>
  );
}
