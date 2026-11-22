import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import {
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import { Pressable, View } from 'react-native';

import { BakedMenuPanel, GachiHud, GachiIconButton, type BakedMenuKey } from '@/components/gachi-ui';
import { usePlayState } from '@/components/play-state';
import { FeatureHelpButton } from '@/components/tutorial/feature-help';
import { getGrowthProgress, getGrowthStage } from '@/constants/growth';
import { useResponsive } from '@/hooks/use-responsive';

const SHOP_ROUTE = '/(tabs)/shop' as Href;
const COLLECTION_ROUTE = '/collection' as Href;
const ICON_SIZE = 32;
const ICON_GAP = 6;
const ICON_COLUMN_MARGIN = 8;
const MAX_PROGRESS_SCAN = 1000;

export type HomeMenuActions = {
  onProfile?: () => void;
  onSettings?: () => void;
  onGuide?: () => void;
  onTutorial?: () => void;
  onToggleSound?: () => void;
  soundOn?: boolean;
  onReset?: () => Promise<void> | void;
};

type HomeMenuAnchor = { x: number; y: number };

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

export function homeShopIconCenter(scale: (value: number) => number, insetTop: number) {
  return {
    fromRight: scale(14) + scale(ICON_SIZE) / 2,
    fromTop: insetTop + scale(8) + scale(ICON_SIZE) + scale(ICON_GAP) + scale(ICON_SIZE) / 2,
    size: scale(ICON_SIZE),
  };
}

export function HomeTopIcons({
  top,
  side,
  menuActions,
  onHelp,
}: {
  top: number;
  side: number;
  menuActions?: HomeMenuActions;
  onHelp?: () => void;
}) {
  const { scale } = useResponsive();
  const menuRef = useRef<ComponentRef<typeof View>>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HomeMenuAnchor | null>(null);

  const toggleMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const node = menuRef.current;
    if (!node) {
      return;
    }
    node.measureInWindow((x, y) => {
      setMenuAnchor({ x, y });
      setMenuOpen(true);
    });
  };

  const onSelect = (key: BakedMenuKey) => {
    if (key === 'profile') {
      menuActions?.onProfile?.();
      return;
    }
    if (key === 'settings') {
      menuActions?.onSettings?.();
      return;
    }
    if (key === 'help') {
      menuActions?.onTutorial?.() ?? menuActions?.onGuide?.() ?? onHelp?.();
      return;
    }
    // 로그아웃 자리 — 개발 중에는 로컬 초기화로 연결
    void menuActions?.onReset?.();
  };

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
      <BakedMenuPanel open={menuOpen} anchor={menuAnchor} onClose={() => setMenuOpen(false)} onSelect={onSelect} />
      <View style={{ gap: scale(ICON_GAP) }}>
        <View ref={menuRef} collapsable={false}>
          <GachiIconButton kind="squareMenu" label="메뉴" size={ICON_SIZE} onPress={toggleMenu} />
        </View>
        <View style={{ gap: scale(ICON_GAP) }}>
          <GachiIconButton kind="roundShop" label="상점" size={ICON_SIZE} onPress={() => router.navigate(SHOP_ROUTE)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="도감"
            onPress={() => router.push(COLLECTION_ROUTE)}
            hitSlop={4}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
            <Image
              source={require('@/assets/pixel/icon-book.png')}
              style={{ width: scale(ICON_SIZE), height: scale(ICON_SIZE) }}
              contentFit="contain"
            />
          </Pressable>
          {onHelp ? <FeatureHelpButton size={ICON_SIZE} onPress={onHelp} /> : null}
        </View>
      </View>
    </View>
  );
}

export function HomeTopBar({ coinRowExtra }: { coinRowExtra?: ReactNode }) {
  const { scale } = useResponsive();
  const { coins, xp, water, growthStage } = usePlayState();
  const ratio = useMemo(() => getStageRatio(water, xp, growthStage.level), [water, xp, growthStage.level]);

  return (
    <View style={{ gap: scale(6) }}>
      <GachiHud coins={coins} xpRatio={ratio} />
      {coinRowExtra}
    </View>
  );
}
