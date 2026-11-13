import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeTopBar, HomeTopIcons, useHomeTopLayout } from '@/components/home-top-bar';
import { HomeMenuSheet } from '@/components/island/home-menu-sheet';
import { useResponsive } from '@/hooks/use-responsive';

type ResourceHeaderProps = {
  soundOn: boolean;
  onToggleSound: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onShop: () => void;
  onCodex: () => void;
};

export function ResourceHeader({ soundOn, onToggleSound, onProfile, onSettings }: ResourceHeaderProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const { iconsInset } = useHomeTopLayout();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
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
        <View
          pointerEvents="box-none"
          style={{
            marginTop: insets.top + scale(8),
            marginLeft: scale(14),
            marginRight: scale(14) + iconsInset,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}>
          <HomeTopBar />
        </View>

        <HomeTopIcons top={insets.top + scale(8)} side={scale(14)} spread onMenuPress={() => setMenuOpen(true)} />
      </View>

      <HomeMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onProfile={() => {
          setMenuOpen(false);
          onProfile();
        }}
        onSettings={() => {
          setMenuOpen(false);
          onSettings();
        }}
      />
    </>
  );
}
