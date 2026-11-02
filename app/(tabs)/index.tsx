import { useState } from 'react';
import { View } from 'react-native';

import { ExploreEggReward } from '@/components/island/explore-egg-reward';
import { GoodDeedFab, GoodDeedSheet } from '@/components/island/good-deed-sheet';
import { GrowthReveal } from '@/components/island/growth-reveal';
import { IslandStage } from '@/components/island/island-stage';
import { ResourceHeader } from '@/components/island/resource-header';
import { PixelButton, PixelPanel, PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { useResponsive } from '@/hooks/use-responsive';

export default function IslandHomeScreen() {
  const { scale } = useResponsive();
  const {
    growthReveal,
    acknowledgeGrowthReveal,
    hasExploreReward,
    exploreEggReveal,
    claimExploreEgg,
    acknowledgeExploreEggReveal,
  } = usePlayState();
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);

  return (
    <PixelScreen>
      <View style={{ flex: 1, paddingBottom: scale(4) }}>
        <ResourceHeader />
        <View style={{ flex: 1, marginTop: scale(6) }}>
          <IslandStage />
        </View>

        {hasExploreReward && !exploreEggReveal ? (
          <View style={{ paddingHorizontal: scale(12), marginBottom: scale(8) }}>
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

        <GoodDeedFab onPress={() => setOpen(true)} />
        <GoodDeedSheet open={open} onClose={() => setOpen(false)} />

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
    </PixelScreen>
  );
}
