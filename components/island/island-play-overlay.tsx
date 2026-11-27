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
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { getShopItem } from '@/constants/content';
import {
  exploreForestFrameFromCamera,
  islandWorldBoxToScreen,
} from '@/components/island/explore-button-target';
import { ISLAND_STAGE_ART, toIslandStage } from '@/constants/island-stages';
import {
  getIslandStage,
  ISLAND_ZONES,
  ISLAND_ZONE_SHARE,
  type IslandZoneId,
} from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { EXPLORE_ROUTE } from '@/constants/routes';
import { useResponsive } from '@/hooks/use-responsive';
import { saveExploreIntroSeen } from '@/lib/explore-intro-state';

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
    isExploreEntering,
    hasExploreReward,
    exploreRemainLabel,
    exploreProgress,
    petCreature,
  } = usePlayState();
  /** 숲 진입 후 타이머가 돌 때만 바·초 표시 */
  const showExploreTimer = isExploring && !isExploreEntering;
  const exploreRemainRatio = Math.min(1, Math.max(0, 1 - exploreProgress));
  const { step: tutorialStep, scope: tutorialScope, goTo: goTutorial, skip: skipTutorial } =
    useTutorial();
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

  /** 월드(아트) 구역 → 화면 좌표. camera.zones 는 Phaser zoneFrame 값 */
  const toScreen = (id: IslandZoneId) => {
    const share = ISLAND_ZONE_SHARE[id];
    const art = ISLAND_STAGE_ART[toIslandStage(getIslandStage(unlockedZones))];
    const box = camera.zones?.[id] ?? {
      left: share.x * art.width,
      top: share.y * art.height,
      width: share.w * art.width,
      height: share.h * art.height,
    };
    // w/2 + (world − w/2)×zoom + x  (world×zoom + x 는 zoom≠1 이면 바다 쪽으로 빗나감)
    return islandWorldBoxToScreen({ ...camera, w: width, h: height }, box);
  };

  /** 탐험 터치·타이머: 섬 위 풀숲(forest.png) — west 배치 구역과 별개 */
  const westFrame = exploreForestFrameFromCamera(camera, width, height);

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
          accessibilityLabel={
            hasExploreReward
              ? '탐험 보상 받기'
              : isExploring
                ? '탐험 진행 중'
                : '서쪽 숲 모험 보내기'
          }
          onPress={() => {
            if (tutorialScope === 'explore' && tutorialStep === 'explore-button') {
              goTutorial('explore-course');
            } else if (tutorialScope === 'explore' && tutorialStep === 'explore-progress') {
              void saveExploreIntroSeen();
              if (hasExploreReward) {
                goTutorial('explore-reward');
              } else {
                skipTutorial();
              }
              return;
            } else if (
              tutorialScope === 'explore' &&
              (tutorialStep === 'explore-reward' || tutorialStep === 'explore-reward-button')
            ) {
              if (tutorialStep === 'explore-reward') {
                goTutorial('explore-reward-button');
              }
            }
            // 탐험 중에는 현황 페이지를 열지 않는다 (바·초만 표시)
            if (isExploring && !hasExploreReward) {
              return;
            }
            router.push(EXPLORE_ROUTE);
          }}
          style={{
            position: 'absolute',
            left: westFrame.left,
            top: westFrame.top,
            width: westFrame.width,
            height: westFrame.height,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1 - Math.max(ash.mid, ash.bottom),
          }}>
          {showExploreTimer ? (
            <View
              pointerEvents="none"
              style={{
                width: Math.min(westFrame.width * 0.72, scale(120)),
                alignItems: 'center',
                gap: scale(4),
              }}>
              <View
                style={{
                  width: '100%',
                  height: scale(10),
                  borderWidth: scale(2),
                  borderColor: pixel.ink,
                  backgroundColor: 'rgba(255,253,248,0.55)',
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    width: `${Math.round(exploreRemainRatio * 100)}%`,
                    height: '100%',
                    backgroundColor: pixel.leaf,
                  }}
                />
              </View>
              <PixelText size={11} color={pixel.ink} center>
                {exploreRemainLabel}
              </PixelText>
            </View>
          ) : null}
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
