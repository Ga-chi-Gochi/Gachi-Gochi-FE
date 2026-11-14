import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { sandStandY } from '@/components/island/beach-home';
import { useIslandCameraStyle } from '@/components/island/island-camera';

import { ExploreWaitingAnim } from '@/components/island/explore-waiting-anim';
import {
  PlaceSuccessToast,
  PlaceZoneTarget,
  PlacedDecorDrop,
} from '@/components/island/place-mode';
import { WanderingCreature, type WalkPoint } from '@/components/island/wandering-creature';
import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { getShopItem } from '@/constants/content';
import { ISLAND_ZONES, type IslandZoneId } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { EXPLORE_ROUTE } from '@/constants/routes';
import { useResponsive } from '@/hooks/use-responsive';

/** 해변 화면 비율. 초록 격자 섬 대신 이 구역에서 걷고, 놓고, 넓힌다. */
const ZONE_FRAME: Record<IslandZoneId, { x: number; y: number; w: number; h: number }> = {
  core: { x: 0.24, y: 0.28, w: 0.52, h: 0.44 },
  west: { x: 0.0, y: 0.34, w: 0.24, h: 0.36 },
  east: { x: 0.76, y: 0.34, w: 0.24, h: 0.36 },
  north: { x: 0.24, y: 0.16, w: 0.52, h: 0.14 },
  south: { x: 0.24, y: 0.7, w: 0.52, h: 0.12 },
};

type Box = { width: number; height: number };

type BeachPlayProps = {
  petOpen: boolean;
  onPet: () => void;
};

export function BeachPlay({ petOpen, onPet }: BeachPlayProps) {
  const { scale } = useResponsive();
  const {
    growthStage,
    unlockedZones,
    placed,
    pendingPlaceItemId,
    lastPlaced,
    placeDecor,
    acknowledgeLastPlaced,
    zoneUnlockReveal,
    acknowledgeZoneUnlock,
    exploreForestUnlocked,
    isExploring,
    hasExploreReward,
    exploreRemainLabel,
    exploreRemaining,
    exploreDailyLimit,
    exploringGochiId,
  } = usePlayState();
  const [box, setBox] = useState<Box>({ width: 0, height: 0 });
  const [toastName, setToastName] = useState<string | null>(null);

  const cameraStyle = useIslandCameraStyle();
  const placing = Boolean(pendingPlaceItemId);
  const pendingItem = pendingPlaceItemId ? getShopItem(pendingPlaceItemId) : null;
  const preferredZoneId = pendingItem?.preferredZone ?? null;

  useEffect(() => {
    if (!zoneUnlockReveal) {
      return;
    }
    const reveal = zoneUnlockReveal;
    const timer = setTimeout(() => {
      setToastName(reveal.zoneName);
      acknowledgeZoneUnlock();
    }, 1700);
    return () => clearTimeout(timer);
  }, [acknowledgeZoneUnlock, zoneUnlockReveal]);

  useEffect(() => {
    if (!toastName) {
      return;
    }
    const timer = setTimeout(() => setToastName(null), 2000);
    return () => clearTimeout(timer);
  }, [toastName]);

  useEffect(() => {
    if (!lastPlaced) {
      return;
    }
    const timer = setTimeout(() => acknowledgeLastPlaced(), 1800);
    return () => clearTimeout(timer);
  }, [acknowledgeLastPlaced, lastPlaced]);

  const openZones = useMemo(() => {
    const ids = new Set(unlockedZones);
    if (zoneUnlockReveal) {
      ids.add(zoneUnlockReveal.zoneId);
    }
    return ids;
  }, [unlockedZones, zoneUnlockReveal]);

  const eggStage = growthStage.level <= 1;
  const walkPoints = useMemo(() => {
    if (box.width === 0 || box.height === 0) {
      return [];
    }
    if (eggStage) {
      return [{ x: box.width / 2, y: sandStandY(box.width, box.height) }];
    }
    return pointsOnBeach([...openZones], box);
  }, [box, eggStage, openZones]);

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}>
      <Reanimated.View pointerEvents="box-none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, cameraStyle]}>
      {ISLAND_ZONES.map((zone) => {
        const decor = placed.filter((entry) => entry.zoneId === zone.id);
        if (decor.length === 0 || !openZones.has(zone.id)) {
          return null;
        }
        const frame = frameBox(zone.id, box);
        return (
          <View
            key={`decor-${zone.id}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: frame.left + frame.width * 0.35,
              top: frame.top + frame.height * 0.45,
              flexDirection: 'row',
              gap: scale(4),
            }}>
            {decor.slice(0, 3).map((entry) => {
              const item = getShopItem(entry.itemId);
              if (!item) {
                return null;
              }
              const fresh = lastPlaced?.itemId === entry.itemId;
              const size = scale(fresh ? 32 : 24);
              return fresh ? (
                <PlacedDecorDrop key={entry.itemId} sprite={item.sprite} size={size} />
              ) : (
                <PixelSprite key={entry.itemId} id={item.sprite} size={size} />
              );
            })}
          </View>
        );
      })}

      {placing
        ? ISLAND_ZONES.map((zone) => {
            const frame = frameBox(zone.id, box);
            const open = unlockedZones.includes(zone.id);
            return (
              <PlaceZoneTarget
                key={`place-${zone.id}`}
                left={frame.left}
                top={frame.top}
                width={frame.width}
                height={frame.height}
                preferred={preferredZoneId === zone.id && open}
                locked={!open}
                onPress={() => {
                  if (!pendingPlaceItemId) {
                    return;
                  }
                  placeDecor(pendingPlaceItemId, zone.id);
                }}
              />
            );
          })
        : null}

      {!placing && !petOpen && walkPoints.length > 0 ? (
        <WanderingCreature growthStage={growthStage} walkPoints={walkPoints} paused={eggStage} onPress={onPet} />
      ) : null}

      {exploreForestUnlocked && isExploring && !placing && !petOpen ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: box.width * 0.06, top: box.height * 0.42 }}>
          <ExploreWaitingAnim gochiId={exploringGochiId} variant="map" />
        </View>
      ) : null}
      </Reanimated.View>

      {exploreForestUnlocked && !placing && !petOpen && !zoneUnlockReveal ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasExploreReward ? '탐험 보상 받기' : isExploring ? '탐험 현황 보기' : '탐험 보내기'}
          onPress={() => router.push(EXPLORE_ROUTE)}
          style={{
            position: 'absolute',
            left: scale(12),
            top: '58%',
            minWidth: scale(72),
            paddingHorizontal: scale(10),
            paddingVertical: scale(8),
            borderWidth: scale(2),
            borderColor: pixel.ink,
            backgroundColor: hasExploreReward ? pixel.lava : isExploring ? pixel.sand : pixel.tangerine,
            alignItems: 'center',
          }}>
          <PixelText size={11} color={hasExploreReward ? pixel.white : pixel.ink}>
            {hasExploreReward ? '보상!' : isExploring ? '탐험중' : '🌲 탐험'}
          </PixelText>
          <PixelText size={9} color={hasExploreReward ? pixel.white : pixel.ink}>
            {hasExploreReward ? '받기' : isExploring ? exploreRemainLabel : `${exploreRemaining}/${exploreDailyLimit}`}
          </PixelText>
        </Pressable>
      ) : null}

      {zoneUnlockReveal ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: '24%', left: 0, right: 0, alignItems: 'center' }}>
          <View
            style={{
              maxWidth: '86%',
              paddingVertical: scale(8),
              paddingHorizontal: scale(12),
              backgroundColor: 'rgba(26,21,32,0.72)',
              borderWidth: scale(2),
              borderColor: pixel.ink,
              alignItems: 'center',
            }}>
            <PixelText size={12} color={pixel.white} center>
              {zoneUnlockReveal.volcanoBurst ? '화산이 흔들려요…' : '바다가 갈라지며 땅이 이어져요…'}
            </PixelText>
          </View>
        </View>
      ) : null}

      {toastName && !lastPlaced ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center' }}>
          <View
            style={{
              maxWidth: '86%',
              paddingHorizontal: scale(14),
              paddingVertical: scale(10),
              backgroundColor: pixel.leaf,
              borderWidth: scale(pixel.border),
              borderColor: pixel.ink,
              alignItems: 'center',
              gap: scale(2),
            }}>
            <PixelText size={13} color={pixel.white} center>
              새로운 지역이 잠금 해제되었어요!
            </PixelText>
            <PixelText size={12} color={pixel.white} center>
              {toastName}
            </PixelText>
          </View>
        </View>
      ) : null}

      {lastPlaced ? (
        <PlaceSuccessToast
          itemName={getShopItem(lastPlaced.itemId)?.name ?? '아이템'}
          zoneName={ISLAND_ZONES.find((zone) => zone.id === lastPlaced.zoneId)?.name ?? lastPlaced.zoneId}
          zoneId={lastPlaced.zoneId}
        />
      ) : null}
    </View>
  );
}

function frameBox(id: IslandZoneId, box: Box) {
  const frame = ZONE_FRAME[id];
  return {
    left: frame.x * box.width,
    top: frame.y * box.height,
    width: frame.w * box.width,
    height: frame.h * box.height,
  };
}

function pointsOnBeach(zones: IslandZoneId[], box: Box): WalkPoint[] {
  if (box.width === 0 || box.height === 0) {
    return [];
  }
  const points: WalkPoint[] = [];
  for (const id of zones) {
    const frame = frameBox(id, box);
    for (const across of [0.28, 0.72]) {
      for (const down of [0.32, 0.68]) {
        points.push({
          x: frame.left + frame.width * across,
          y: frame.top + frame.height * down,
        });
      }
    }
  }
  return points;
}
