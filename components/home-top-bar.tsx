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
import { PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { FeatureHelpButton } from '@/components/tutorial/feature-help';
import { getCreatureXpRatio, getOverallXpRatio } from '@/constants/growth';
import { useResponsive } from '@/hooks/use-responsive';

const SHOP_ROUTE = '/(tabs)/shop' as Href;
const COLLECTION_ROUTE = '/collection' as Href;
const ICON_SIZE = 32;
const ICON_GAP = 6;
const ICON_COLUMN_MARGIN = 8;
const LEVEL_BAR_WIDTH = 200;
const LEVEL_BAR_ART = 1024;
const LEVEL_BAR_ASPECT = 1024 / 256;
const LEVEL_SEGMENT_LEFTS = [
  24, 72, 120, 168, 216, 272, 320, 368, 416, 464, 520, 568, 616, 664, 712, 768,
  816, 864, 912, 960,
];
const LEVEL_SEGMENT = { width: 40, top: 16, height: 96, bleed: 4 };
const LEVEL_BOX = { left: 24, top: 136, width: 316, height: 88 };
const LEVEL_EMPTY_COLOR = "#816e50";
const LEVEL_COIN_SIZE = 16;

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
  iconSize = ICON_SIZE,
  iconGap = ICON_GAP,
}: {
  top: number;
  side: number;
  menuActions?: HomeMenuActions;
  onHelp?: () => void;
  iconSize?: number;
  iconGap?: number;
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
      <View style={{ gap: scale(iconGap) }}>
        <View ref={menuRef} collapsable={false}>
          <GachiIconButton kind="squareMenu" label="메뉴" size={iconSize} onPress={toggleMenu} />
        </View>
        <View style={{ gap: scale(iconGap) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="상점"
            onPress={() => router.navigate(SHOP_ROUTE)}
            hitSlop={4}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
            <Image
              source={require('@/assets/pixel/icon-shop.png')}
              style={{ width: scale(iconSize), height: scale(iconSize) }}
              contentFit="contain"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="도감"
            onPress={() => router.push(COLLECTION_ROUTE)}
            hitSlop={4}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
            <Image
              source={require('@/assets/pixel/icon-book.png')}
              style={{ width: scale(iconSize), height: scale(iconSize) }}
              contentFit="contain"
            />
          </Pressable>
          {onHelp ? <FeatureHelpButton size={iconSize} onPress={onHelp} /> : null}
        </View>
      </View>
    </View>
  );
}

export function HomeTopBar({ coinRowExtra }: { coinRowExtra?: ReactNode }) {
  const { scale } = useResponsive();
  const { coins, xp } = usePlayState();
  const xpRatio = useMemo(() => getOverallXpRatio(xp), [xp]);

  return (
    <View style={{ gap: scale(6) }}>
      <GachiHud coins={coins} xpRatio={xpRatio} />
      {coinRowExtra}
    </View>
  );
}

export function HomeLevelBar() {
  const { scale } = useResponsive();
  const { coins, xp, growthStage } = usePlayState();

  const ratio = useMemo(() => getCreatureXpRatio(xp), [xp]);
  const barWidth = scale(LEVEL_BAR_WIDTH);
  const barHeight = barWidth / LEVEL_BAR_ASPECT;
  const k = barWidth / LEVEL_BAR_ART;
  const filled = Math.round(ratio * LEVEL_SEGMENT_LEFTS.length);

  return (
    <View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`경험치, 레벨 ${growthStage.level}`}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(ratio * 100),
        }}
        style={{ width: barWidth, height: barHeight }}
      >
        <Image
          source={require("@/assets/pixel/xp-bar-level.png")}
          style={{ position: "absolute", width: barWidth, height: barHeight }}
          contentFit="fill"
        />
        {LEVEL_SEGMENT_LEFTS.slice(filled).map((left) => (
          <View
            key={left}
            style={{
              position: "absolute",
              left: (left - LEVEL_SEGMENT.bleed) * k,
              top: LEVEL_SEGMENT.top * k,
              width: (LEVEL_SEGMENT.width + LEVEL_SEGMENT.bleed * 2) * k,
              height: LEVEL_SEGMENT.height * k,
              backgroundColor: LEVEL_EMPTY_COLOR,
            }}
          />
        ))}
        <View
          style={{
            position: "absolute",
            left: LEVEL_BOX.left * k,
            top: LEVEL_BOX.top * k,
            width: LEVEL_BOX.width * k,
            height: LEVEL_BOX.height * k,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <PixelText size={16}>{growthStage.level}</PixelText>
            <PixelText size={10}>Lv</PixelText>
          </View>
        </View>
      </View>
      <View
        accessible
        accessibilityLabel={`귤 ${coins}개`}
        style={{ flexDirection: "row", alignItems: "center", gap: scale(4) }}
      >
        <Image
          source={require("@/assets/pixel/icon-tangerine.png")}
          style={{
            width: scale(LEVEL_COIN_SIZE),
            height: scale(LEVEL_COIN_SIZE),
          }}
          contentFit="contain"
        />
        <PixelText size={11}>{coins}</PixelText>
      </View>
    </View>
  );
}
