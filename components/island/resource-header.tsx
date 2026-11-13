import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeMenuSheet } from '@/components/island/home-menu-sheet';
import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

const XP_SEGMENTS = 10;

function XpBar({ xp }: { xp: number }) {
  const { scale } = useResponsive();
  const filled = useMemo(() => Math.min(XP_SEGMENTS, Math.max(0, Math.floor((xp % 100) / 10))), [xp]);

  return (
    <View
      accessibilityLabel={`경험치 ${xp}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
      <PixelText size={11} color={pixel.ink}>
        XP
      </PixelText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale(2),
          paddingHorizontal: scale(6),
          paddingVertical: scale(4),
          backgroundColor: pixel.paper,
          borderWidth: scale(2),
          borderColor: pixel.ink,
          borderRadius: scale(999),
        }}>
        {Array.from({ length: XP_SEGMENTS }).map((_, index) => (
          <View
            key={index}
            style={{
              width: scale(8),
              height: scale(12),
              backgroundColor: index < filled ? pixel.grass : pixel.white,
              borderWidth: scale(1),
              borderColor: pixel.ink,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function SideIconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const { scale } = useResponsive();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: scale(44),
        height: scale(44),
        borderRadius: scale(10),
        borderWidth: scale(3),
        borderColor: pixel.ink,
        backgroundColor: pixel.sand,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}>
      {children}
    </Pressable>
  );
}

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
  onShop,
  onCodex,
}: ResourceHeaderProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const { coins, xp } = usePlayState();
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
          marginHorizontal: scale(14),
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
        <View style={{ gap: scale(8) }}>
          <XpBar xp={xp} />
          <View
            accessibilityLabel={`귤코인 ${coins}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
            <PixelSprite id="tangerine" size={scale(24)} />
            <View
              style={{
                backgroundColor: pixel.paper,
                borderWidth: scale(2),
                borderColor: pixel.ink,
                paddingHorizontal: scale(10),
                paddingVertical: scale(4),
              }}>
              <PixelText size={18}>{coins}</PixelText>
            </View>
          </View>
        </View>

        <SideIconButton label="메뉴" onPress={() => setMenuOpen(true)}>
          <MaterialIcons name="menu" size={scale(22)} color={pixel.ink} />
        </SideIconButton>
      </View>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', right: scale(18), top: '31%', alignItems: 'flex-end', gap: scale(12) }}>
        <ShopSign onPress={onShop} />
        <CodexSign onPress={onCodex} />
      </View>
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

function ShopSign({ onPress }: { onPress: () => void }) {
  const { scale } = useResponsive();
  const stripes = ['#E24B4B', pixel.white, '#E24B4B', pixel.white, '#E24B4B'];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="상점"
      onPress={onPress}
      style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.85 : 1, minWidth: scale(44), minHeight: scale(44) })}>
      <View style={{ flexDirection: 'row', width: scale(56), height: scale(12) }}>
        {stripes.map((color, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              backgroundColor: color,
              borderTopWidth: scale(2),
              borderLeftWidth: index === 0 ? scale(2) : 0,
              borderRightWidth: index === stripes.length - 1 ? scale(2) : 0,
              borderColor: pixel.ink,
            }}
          />
        ))}
      </View>
      <View
        style={{
          backgroundColor: '#C4A574',
          borderWidth: scale(2),
          borderColor: pixel.ink,
          paddingHorizontal: scale(8),
          paddingVertical: scale(2),
        }}>
        <PixelText size={11}>SHOP</PixelText>
      </View>
    </Pressable>
  );
}

function CodexSign({ onPress }: { onPress: () => void }) {
  const { scale } = useResponsive();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="도감"
      onPress={onPress}
      style={({ pressed }) => ({
        width: scale(44),
        height: scale(52),
        backgroundColor: '#8B3A2F',
        borderWidth: scale(3),
        borderColor: pixel.ink,
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(4),
        opacity: pressed ? 0.85 : 1,
      })}>
      <View style={{ width: scale(22), height: scale(2), backgroundColor: pixel.paper }} />
      <View style={{ width: scale(22), height: scale(2), backgroundColor: pixel.paper }} />
      <View style={{ width: scale(22), height: scale(2), backgroundColor: pixel.paper }} />
    </Pressable>
  );
}
