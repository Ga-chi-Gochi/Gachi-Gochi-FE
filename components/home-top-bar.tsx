import { Image, type ImageSource } from 'expo-image';
import { router, usePathname, type Href } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { CollectionButton } from '@/components/collection-button';
import { HomeMenuPopup } from '@/components/home-menu-popup';
import { PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { getGrowthProgress, getGrowthStage } from '@/constants/growth';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

const SHOP_ROUTE = '/(tabs)/shop' as Href;
const XP_BAR_ASPECT = 1024 / 128;
const XP_BAR_WIDTH = 150;
const ICON_SIZE = 42;
const ICON_GAP = 4;
const ICON_COLUMN_MARGIN = 8;
const MAX_PROGRESS_SCAN = 1000;

function getStageRatio(water: number, xp: number, level: number): number {
  const progress = getGrowthProgress(water, xp);
  let start = 0;
  while (start < MAX_PROGRESS_SCAN && getGrowthStage(start).level < level) start++;
  let end = start;
  while (end < MAX_PROGRESS_SCAN && getGrowthStage(end).level <= level) end++;
  if (end >= MAX_PROGRESS_SCAN || end <= start) return 1;
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

export function useHomeTopLayout() {
  const { scale } = useResponsive();
  const iconSize = scale(ICON_SIZE);
  const gap = scale(ICON_GAP);
  return {
    iconsInset: iconSize + scale(ICON_COLUMN_MARGIN),
    iconsHeight: iconSize * 3 + gap * 2,
  };
}

function TopBarIcon({
  label,
  source,
  active = false,
  onPress,
}: {
  label: string;
  source: ImageSource;
  active?: boolean;
  onPress: () => void;
}) {
  const { scale } = useResponsive();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={2}
      style={({ pressed }) => ({
        width: scale(ICON_SIZE),
        height: scale(ICON_SIZE),
        padding: scale(2),
        backgroundColor: active ? pixel.tangerine : 'transparent',
        borderWidth: scale(2),
        borderColor: active ? pixel.ink : 'transparent',
        opacity: pressed ? 0.8 : 1,
      })}>
      <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="contain" />
    </Pressable>
  );
}

export function HomeTopIcons({ top, side }: { top: number; side: number }) {
  const { scale } = useResponsive();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top,
        left: side,
        right: side,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        gap: scale(6),
      }}>
      {menuOpen ? <HomeMenuPopup onClose={() => setMenuOpen(false)} /> : null}
      <View style={{ gap: scale(ICON_GAP) }}>
        <TopBarIcon
          label="메뉴"
          source={require('@/assets/pixel/icon-menu.png')}
          active={menuOpen}
          onPress={() => setMenuOpen((open) => !open)}
        />
        <TopBarIcon
          label="상점"
          source={require('@/assets/pixel/icon-shop.png')}
          active={pathname === '/shop'}
          onPress={() => router.navigate(SHOP_ROUTE)}
        />
        <CollectionButton size={ICON_SIZE} active={pathname === '/collection'} />
      </View>
    </View>
  );
}

export function HomeTopBar({ coinRowExtra }: { coinRowExtra?: ReactNode }) {
  const { scale } = useResponsive();
  const { coins, xp, water, growthStage } = usePlayState();

  const ratio = useMemo(() => getStageRatio(water, xp, growthStage.level), [water, xp, growthStage.level]);
  const barWidth = scale(XP_BAR_WIDTH);
  const barHeight = barWidth / XP_BAR_ASPECT;

  return (
    <View style={{ gap: scale(6) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
        <PixelText size={14}>XP</PixelText>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="경험치"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
          style={{ width: barWidth, height: barHeight }}>
          <Image
            source={require('@/assets/pixel/xp-bar-empty.png')}
            style={{ position: 'absolute', width: barWidth, height: barHeight }}
            contentFit="fill"
          />
          <View style={{ width: barWidth * ratio, height: barHeight, overflow: 'hidden' }}>
            <Image
              source={require('@/assets/pixel/xp-bar-full.png')}
              style={{ width: barWidth, height: barHeight }}
              contentFit="fill"
            />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: scale(6) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
          <Image
            source={require('@/assets/pixel/icon-tangerine.png')}
            style={{ width: scale(24), height: scale(24) }}
            contentFit="contain"
          />
          <PixelText size={13}>{coins}개</PixelText>
        </View>
        {coinRowExtra}
      </View>
    </View>
  );
}
