import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeLevelBar, HomeTopIcons } from '@/components/home-top-bar';
import { usePlayState } from '@/components/play-state';
import { useResponsive } from '@/hooks/use-responsive';

type ResourceHeaderProps = {
  soundOn: boolean;
  onToggleSound: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onShop: () => void;
  onCodex: () => void;
};

export function ResourceHeader({
  soundOn,
  onToggleSound,
  onProfile,
  onSettings,
}: ResourceHeaderProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const { resetLocalData } = usePlayState();
  const top = Math.max(scale(32), insets.top);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 20,
      }}>
      <View pointerEvents="box-none" style={{ position: 'absolute', top, left: scale(32) }}>
        <HomeLevelBar />
      </View>

      <HomeTopIcons
        top={top}
        side={scale(22)}
        iconSize={40}
        iconGap={8}
        menuSource={require('@/assets/pixel/btn-square-menu.png')}
        menuActions={{ onProfile, onSettings, onToggleSound, soundOn, onReset: resetLocalData }}
      />
    </View>
  );
}
