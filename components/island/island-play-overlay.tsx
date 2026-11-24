// 섬 위에 뜨는 RN 화면 요소. BeachIsland · BeachPlay 에서 섬 그림(게임으로 옮김)을 뺀 나머지다.
// 배치 구역은 게임 카메라(확대·이동)에 맞춰 같은 자리에 띄운다.
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';

import type { IslandAsh, IslandCameraState } from '@/components/island/island-game';
import { PetCreature } from '@/components/island/pet-creature';
import { PlaceGuideBanner, PlaceSuccessToast, PlaceZoneTarget } from '@/components/island/place-mode';
import { PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { getShopItem } from '@/constants/content';
import { ISLAND_ZONES, type IslandZoneId } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { EXPLORE_ROUTE } from '@/constants/routes';
import { useResponsive } from '@/hooks/use-responsive';

/** 해변 화면 비율 (game/src/scene.ts 와 같다) */
const ZONE_FRAME: Record<IslandZoneId, { x: number; y: number; w: number; h: number }> = {
  core: { x: 0.24, y: 0.28, w: 0.52, h: 0.44 },
  west: { x: 0.0, y: 0.34, w: 0.24, h: 0.36 },
  east: { x: 0.76, y: 0.34, w: 0.24, h: 0.36 },
  north: { x: 0.24, y: 0.16, w: 0.52, h: 0.14 },
  south: { x: 0.24, y: 0.7, w: 0.52, h: 0.12 },
};

type IslandPlayOverlayProps = {
  camera: IslandCameraState;
  /** 화산재가 덮은 만큼 버튼·토스트를 흐리게 한다 (구름이 RN 화면 위까지 덮던 것과 같게 보이도록) */
  ash: IslandAsh;
  petOpen: boolean;
  onClosePet: () => void;
};

export function IslandPlayOverlay({ camera, ash, petOpen, onClosePet }: IslandPlayOverlayProps) {
  const { scale } = useResponsive();
  const windowSize = useWindowDimensions();
  // 게임이 알려 준 화면 크기를 쓴다 (섬 좌표의 기준이 같아야 배치 구역이 맞는다)
  const width = camera.w || windowSize.width;
  const height = camera.h || windowSize.height;
  const {
    growthStage,
    unlockedZones,
    pendingPlaceItemId,
    lastPlaced,
    placeDecor,
    cancelPlacing,
    acknowledgeLastPlaced,
    zoneUnlockReveal,
    acknowledgeZoneUnlock,
    exploreForestUnlocked,
    isExploring,
    hasExploreReward,
    exploreRemainLabel,
    exploreRemaining,
    exploreDailyLimit,
    petCreature,
  } = usePlayState();
  const [toastName, setToastName] = useState<string | null>(null);

  const placing = Boolean(pendingPlaceItemId);
  const pendingItem = pendingPlaceItemId ? getShopItem(pendingPlaceItemId) : null;
  const preferredZoneId = pendingItem?.preferredZone ?? null;
  const preferredName = preferredZoneId ? ISLAND_ZONES.find((zone) => zone.id === preferredZoneId)?.name : undefined;

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
    // 장식이 떨어지는 연출은 게임이 그리고, 진동은 여기서 낸다 (예전 PlacedDecorDrop 과 같다)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timer = setTimeout(() => acknowledgeLastPlaced(), 1800);
    return () => clearTimeout(timer);
  }, [acknowledgeLastPlaced, lastPlaced]);

  /** 섬 좌표 → 화면 좌표 (게임 카메라: 화면 가운데 기준 확대 후 이동) */
  const toScreen = (id: IslandZoneId) => {
    const f = ZONE_FRAME[id];
    const left = f.x * width;
    const top = f.y * height;
    return {
      left: width / 2 + (left - width / 2) * camera.zoom + camera.x,
      top: height / 2 + (top - height / 2) * camera.zoom + camera.y,
      width: f.w * width * camera.zoom,
      height: f.h * height * camera.zoom,
    };
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
      {placing
        ? ISLAND_ZONES.map((zone) => {
            const frame = toScreen(zone.id);
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

      {pendingPlaceItemId ? (
        <View style={{ position: 'absolute', top: '14%', left: scale(12), right: scale(88), zIndex: 6 }}>
          <PlaceGuideBanner itemId={pendingPlaceItemId} preferredZoneName={preferredName} onCancel={cancelPlacing} />
        </View>
      ) : null}

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
            opacity: 1 - Math.max(ash.mid, ash.bottom),
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
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: '24%', left: 0, right: 0, alignItems: 'center', opacity: 1 - ash.mid }}>
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
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: '22%', left: 0, right: 0, alignItems: 'center', opacity: 1 - ash.mid }}>
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

      {petOpen ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(26,21,32,0.28)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: scale(12),
          }}>
          <View
            style={{
              width: '100%',
              maxWidth: scale(300),
              backgroundColor: pixel.panel,
              borderWidth: scale(pixel.border),
              borderColor: pixel.ink,
              alignItems: 'center',
              gap: scale(8),
              paddingVertical: scale(14),
              paddingHorizontal: scale(10),
            }}>
            <PixelText size={14} center>
              쓰담쓰담
            </PixelText>
            <PetCreature growthStage={growthStage} onPetComplete={() => void petCreature()} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="쓰다듬기 닫기"
              onPress={onClosePet}
              style={{
                marginTop: scale(4),
                paddingHorizontal: scale(16),
                paddingVertical: scale(8),
                borderWidth: scale(2),
                borderColor: pixel.ink,
                backgroundColor: pixel.white,
              }}>
              <PixelText size={13}>닫기</PixelText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
