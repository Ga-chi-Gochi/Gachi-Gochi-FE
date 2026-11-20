import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { VISIBLE_ISLAND_LOOKS, type IslandLook } from '@/components/island/beach-home';
import { IslandGame, NO_ASH, type IslandAsh, type IslandCameraState } from '@/components/island/island-game';
import { IslandPlayOverlay } from '@/components/island/island-play-overlay';
import { VolcanoEruptionProvider } from '@/components/island/volcano-eruption';
import { ExploreEggReward } from '@/components/island/explore-egg-reward';
import { GrowthReveal } from '@/components/island/growth-reveal';
import { HomeActivityToggle } from '@/components/island/home-activity-toggle';
import { HomeSheet } from '@/components/island/home-sheet';
import { ResourceHeader } from '@/components/island/resource-header';
import { PixelButton, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { useResponsive } from '@/hooks/use-responsive';

/** 프로필에 보여줄 목 닉네임 */
const PROFILE_NAME = '가치';

type SheetState = { title: string; body: string } | null;

export default function IslandHomeScreen() {
  const { scale } = useResponsive();
  const {
    growthStage,
    zoneUnlockReveal,
    pendingPlaceItemId,
    growthReveal,
    acknowledgeGrowthReveal,
    hasExploreReward,
    exploreEggReveal,
    claimExploreEgg,
    acknowledgeExploreEggReveal,
  } = usePlayState();
  const [claiming, setClaiming] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [petOpen, setPetOpen] = useState(false);
  const [islandVersion, setIslandVersion] = useState<IslandLook>(1);
  const [camera, setCamera] = useState<IslandCameraState>({ zoom: 1, x: 0, y: 0, w: 0, h: 0 });
  const [ash, setAsh] = useState<IslandAsh>(NO_ASH);
  const openPet = () => {
    if (zoneUnlockReveal || pendingPlaceItemId) {
      return;
    }
    setPetOpen(true);
  };

  return (
    <VolcanoEruptionProvider>
    <View style={{ flex: 1 }}>
      {/* 섬 그림은 게임(웹뷰)이 그린다. 확대·이동·귤새 탭도 게임이 받는다. */}
      <IslandGame
        look={VISIBLE_ISLAND_LOOKS.includes(islandVersion) ? islandVersion : 1}
        petOpen={petOpen}
        onTapCreature={openPet}
        onCamera={setCamera}
        onAsh={setAsh}
      />
      <IslandPlayOverlay camera={camera} ash={ash} petOpen={petOpen} onClosePet={() => setPetOpen(false)} />
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 1 - ash.top }}>
        <ResourceHeader
          soundOn={soundOn}
          onToggleSound={() => setSoundOn((current) => !current)}
          onProfile={() => setSheet({ title: '프로필', body: '' })}
          onSettings={() => setSheet({ title: '설정', body: '준비 중' })}
          onShop={() => router.push('/(tabs)/shop' as Href)}
          onCodex={() => router.push('/collection' as Href)}
          islandVersion={islandVersion}
          onPickIslandVersion={setIslandVersion}
        />

        {hasExploreReward && !exploreEggReveal ? (
          <View
            style={{
              position: 'absolute',
              left: scale(12),
              right: scale(12),
              top: scale(108),
              zIndex: 25,
            }}>
            <PixelPanel style={{ gap: scale(8), alignItems: 'center' }}>
              <PixelText size={13} center>
                탐험 완료! 고치 알 보상이 있어요
              </PixelText>
              <PixelButton
                label={claiming ? '받는 중…' : '탐험 완료! 보상 받기'}
                tone="orange"
                disabled={claiming}
                onPress={() => {
                  setClaiming(true);
                  void claimExploreEgg().finally(() => setClaiming(false));
                }}
              />
            </PixelPanel>
          </View>
        ) : null}

        <HomeActivityToggle />

        <HomeSheet open={sheet != null} title={sheet?.title ?? ''} onClose={() => setSheet(null)}>
          {sheet?.title === '프로필' ? (
            <View style={{ gap: scale(8) }}>
              <PixelText size={14} weight="500">
                {PROFILE_NAME ? `닉네임 ${PROFILE_NAME}` : '이름 없는 귤새'}
              </PixelText>
              <PixelText size={14} weight="500">
                {`귤새 ${growthStage.label}`}
              </PixelText>
            </View>
          ) : (
            <PixelText size={14} weight="500">
              {sheet?.body}
            </PixelText>
          )}
        </HomeSheet>

        {growthReveal ? <GrowthReveal from={growthReveal.from} to={growthReveal.to} onDone={acknowledgeGrowthReveal} /> : null}
        {exploreEggReveal ? (
          <ExploreEggReward
            eggId={exploreEggReveal.eggId}
            eggCount={exploreEggReveal.eggCount}
            isNewType={exploreEggReveal.isNewType}
            onDone={acknowledgeExploreEggReveal}
          />
        ) : null}
      </View>
      {ash.block ? (
        // 화산재가 화면을 덮는 동안은 버튼도 못 누르게 막는다 (예전 VolcanoGas 가 맨 위에서 터치를 받던 것과 같다)
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 80 }} />
      ) : null}
    </View>
    </VolcanoEruptionProvider>
  );
}

