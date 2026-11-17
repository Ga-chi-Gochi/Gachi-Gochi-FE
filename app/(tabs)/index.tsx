import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { GUIDE_OTHER_PAGE, OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { PixelButton, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { TutorialHomeCards } from '@/components/tutorial/tutorial-home-cards';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { useResponsive } from '@/hooks/use-responsive';
import { hasSeenOnboarding, readCreatureName } from '@/lib/onboarding-state';

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
  const { start: startTutorial } = useTutorial();
  const [claiming, setClaiming] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [petOpen, setPetOpen] = useState(false);
  const [islandVersion, setIslandVersion] = useState<IslandLook>(1);
  const [camera, setCamera] = useState<IslandCameraState>({ zoom: 1, x: 0, y: 0, w: 0, h: 0 });
  const [ash, setAsh] = useState<IslandAsh>(NO_ASH);
  const [nickname, setNickname] = useState(PROFILE_NAME);
  const [creatureName, setCreatureName] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [guidePage, setGuidePage] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [seen, saved] = await Promise.all([hasSeenOnboarding(), readCreatureName()]);
      if (!alive) {
        return;
      }
      if (saved) {
        setNickname(saved);
        setCreatureName(saved);
      }
      if (!seen) {
        setShowGuide(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
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
          onReplayGuide={() => setShowGuide(true)}
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

        <HomeActivityToggle expanded={showGuide && guidePage === GUIDE_OTHER_PAGE} tourEnabled={!showGuide} />

        <HomeSheet open={sheet != null} title={sheet?.title ?? ''} onClose={() => setSheet(null)}>
          {sheet?.title === '프로필' ? (
            <View style={{ gap: scale(8) }}>
              <PixelText size={14} weight="500">
                {nickname ? `닉네임 ${nickname}` : '이름 없는 귤새'}
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
      {showGuide ? (
        <OnboardingFlow
          initialName={creatureName}
          onPageChange={setGuidePage}
          onDone={(name) => {
            if (name) {
              setNickname(name);
              setCreatureName(name);
            }
            setShowGuide(false);
            // 가이드(다시 보기 포함)가 끝나면 튜토리얼이 처음부터 이어진다
            startTutorial();
          }}
        />
      ) : null}
      <TutorialHomeCards enabled={!showGuide} />
      {ash.block ? (
        // 화산재가 화면을 덮는 동안은 버튼도 못 누르게 막는다 (예전 VolcanoGas 가 맨 위에서 터치를 받던 것과 같다)
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 80 }} />
      ) : null}
    </View>
    </VolcanoEruptionProvider>
  );
}

