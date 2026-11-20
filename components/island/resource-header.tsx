import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeTopBar, HomeTopIcons, useHomeTopLayout } from '@/components/home-top-bar';
import { VISIBLE_ISLAND_LOOKS } from '@/components/island/beach-home';
import { PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type IslandVersion = 1 | 2 | 3;

type ResourceHeaderProps = {
  soundOn: boolean;
  onToggleSound: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onReplayGuide: () => void;
  onReplayTutorial: () => void;
  onHelp: () => void;
  onShop: () => void;
  onCodex: () => void;
  islandVersion: 1 | 2 | 3;
  onPickIslandVersion: (version: IslandVersion) => void;
};

function IslandVersionButtons({
  version,
  onPick,
}: {
  version: 1 | 2 | 3;
  onPick: (version: IslandVersion) => void;
}) {
  const { scale } = useResponsive();
  if (VISIBLE_ISLAND_LOOKS.length < 2) {
    return null;
  }
  return (
    <View style={{ flexDirection: 'row', gap: scale(6), marginTop: scale(6) }}>
      {VISIBLE_ISLAND_LOOKS.map((id) => {
        const selected = id === version;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`섬 버전 ${id}`}
            accessibilityState={{ selected }}
            onPress={() => onPick(id)}
            style={{
              minWidth: scale(44),
              minHeight: scale(44),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: scale(pixel.border),
              borderColor: pixel.ink,
              backgroundColor: selected ? pixel.tangerine : pixel.white,
            }}>
            <PixelText size={13} color={selected ? pixel.white : pixel.ink}>
              {id}
            </PixelText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ResourceHeader({
  soundOn,
  onToggleSound,
  onProfile,
  onSettings,
  onReplayGuide,
  onReplayTutorial,
  onHelp,
  islandVersion,
  onPickIslandVersion,
}: ResourceHeaderProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const { iconsInset } = useHomeTopLayout();
  const { resetLocalData } = usePlayState();

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
      <View
        pointerEvents="box-none"
        style={{
          marginTop: insets.top + scale(8),
          marginLeft: scale(14),
          marginRight: scale(14) + iconsInset,
          flexDirection: 'row',
          alignItems: 'flex-start',
        }}>
        <View>
          <HomeTopBar />
          <IslandVersionButtons version={islandVersion} onPick={onPickIslandVersion} />
        </View>
      </View>

      <HomeTopIcons
        top={insets.top + scale(8)}
        side={scale(14)}
        onHelp={onHelp}
        menuActions={{
          onProfile,
          onSettings,
          onGuide: onReplayGuide,
          onTutorial: onReplayTutorial,
          onToggleSound,
          soundOn,
          onReset: resetLocalData,
        }}
      />
    </View>
  );
}
