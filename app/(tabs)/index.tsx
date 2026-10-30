import { useState } from 'react';
import { View } from 'react-native';

import { GoodDeedFab, GoodDeedSheet } from '@/components/island/good-deed-sheet';
import { GrowthReveal } from '@/components/island/growth-reveal';
import { IslandStage } from '@/components/island/island-stage';
import { ResourceHeader } from '@/components/island/resource-header';
import { PixelScreen } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { useResponsive } from '@/hooks/use-responsive';

export default function IslandHomeScreen() {
  const { scale } = useResponsive();
  const { growthReveal, acknowledgeGrowthReveal } = usePlayState();
  const [open, setOpen] = useState(false);

  return (
    <PixelScreen>
      <View style={{ flex: 1, paddingBottom: scale(4) }}>
        <ResourceHeader />
        <View style={{ flex: 1, marginTop: scale(6) }}>
          <IslandStage />
        </View>
        <GoodDeedFab onPress={() => setOpen(true)} />
        <GoodDeedSheet open={open} onClose={() => setOpen(false)} />

        {growthReveal ? <GrowthReveal from={growthReveal.from} to={growthReveal.to} onDone={acknowledgeGrowthReveal} /> : null}
      </View>
    </PixelScreen>
  );
}
