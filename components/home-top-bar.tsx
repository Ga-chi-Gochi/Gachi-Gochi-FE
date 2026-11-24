import { Image, type ImageSource } from "expo-image";
import { router, usePathname, type Href } from "expo-router";
import {
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Pressable, View } from "react-native";

import {
  HomeMenuPopup,
  type HomeMenuActions,
  type HomeMenuAnchor,
} from "@/components/home-menu-popup";
import { PixelText } from "@/components/pixel/pixel-ui";
import { usePlayState } from "@/components/play-state";
import { getGrowthProgress, getGrowthStage } from "@/constants/growth";
import { pixel } from "@/constants/pixel-theme";
import { useResponsive } from "@/hooks/use-responsive";

const SHOP_ROUTE = "/(tabs)/shop" as Href;
const COLLECTION_ROUTE = "/collection" as Href;
const XP_BAR_ASPECT = 1024 / 128;
const XP_BAR_WIDTH = 208;
const COIN_ICON_SIZE = 18;
const ICON_SIZE = 42;
const ICON_GAP = 6;
const ACTIVE_DOT_SIZE = 5;
const ICON_COLUMN_MARGIN = 8;
const MAX_PROGRESS_SCAN = 1000;
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

function getStageRatio(water: number, xp: number, level: number): number {
  const progress = getGrowthProgress(water, xp);
  let start = 0;
  while (start < MAX_PROGRESS_SCAN && getGrowthStage(start).level < level)
    start++;
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
  size = ICON_SIZE,
  active = false,
  onPress,
}: {
  label: string;
  source: ImageSource;
  size?: number;
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
        width: scale(size),
        height: scale(size),
        alignItems: "center",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
      />
      {active ? (
        <View
          style={{
            position: "absolute",
            bottom: -scale(ACTIVE_DOT_SIZE),
            width: scale(ACTIVE_DOT_SIZE),
            height: scale(ACTIVE_DOT_SIZE),
            backgroundColor: pixel.tangerine,
          }}
        />
      ) : null}
    </Pressable>
  );
}

export function HomeTopIcons({
  top,
  side,
  menuActions,
  iconSize = ICON_SIZE,
  iconGap = ICON_GAP,
  menuSource = require("@/assets/pixel/icon-menu.png"),
}: {
  top: number;
  side: number;
  menuActions?: HomeMenuActions;
  iconSize?: number;
  iconGap?: number;
  menuSource?: ImageSource;
}) {
  const { scale } = useResponsive();
  const pathname = usePathname();
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

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top,
        left: side,
        right: side,
        zIndex: 10,
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        gap: scale(6),
      }}
    >
      <HomeMenuPopup
        {...menuActions}
        open={menuOpen}
        anchor={menuAnchor}
        onClose={() => setMenuOpen(false)}
      />
      <View style={{ gap: scale(iconGap) }}>
        <View ref={menuRef} collapsable={false}>
          <TopBarIcon
            label="메뉴"
            source={menuSource}
            size={iconSize}
            active={menuOpen}
            onPress={toggleMenu}
          />
        </View>
        <View style={{ gap: scale(iconGap) }}>
          <TopBarIcon
            label="상점"
            source={require("@/assets/pixel/icon-shop.png")}
            size={iconSize}
            active={pathname === "/shop"}
            onPress={() => router.navigate(SHOP_ROUTE)}
          />
          <TopBarIcon
            label="도감"
            source={require("@/assets/pixel/icon-book.png")}
            size={iconSize}
            active={pathname === "/collection"}
            onPress={() => router.push(COLLECTION_ROUTE)}
          />
        </View>
      </View>
    </View>
  );
}

export function HomeTopBar({ coinRowExtra }: { coinRowExtra?: ReactNode }) {
  const { scale } = useResponsive();
  const { coins, xp, water, growthStage } = usePlayState();

  const ratio = useMemo(
    () => getStageRatio(water, xp, growthStage.level),
    [water, xp, growthStage.level],
  );
  const barWidth = scale(XP_BAR_WIDTH);
  const barHeight = barWidth / XP_BAR_ASPECT;

  return (
    <View style={{ gap: scale(2) }}>
      <View style={{ height: scale(ICON_SIZE), justifyContent: "center" }}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="경험치"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(ratio * 100),
          }}
          style={{ width: barWidth, height: barHeight }}
        >
          <Image
            source={require("@/assets/pixel/xp-bar-empty.png")}
            style={{ position: "absolute", width: barWidth, height: barHeight }}
            contentFit="fill"
          />
          <View
            style={{
              width: barWidth * ratio,
              height: barHeight,
              overflow: "hidden",
            }}
          >
            <Image
              source={require("@/assets/pixel/xp-bar-full.png")}
              style={{ width: barWidth, height: barHeight }}
              contentFit="fill"
            />
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: scale(6),
        }}
      >
        <View
          accessible
          accessibilityLabel={`귤 ${coins}개`}
          style={{ flexDirection: "row", alignItems: "center", gap: scale(4) }}
        >
          <Image
            source={require("@/assets/pixel/icon-tangerine.png")}
            style={{
              width: scale(COIN_ICON_SIZE),
              height: scale(COIN_ICON_SIZE),
            }}
            contentFit="contain"
          />
          <PixelText size={11}>{coins}</PixelText>
        </View>
        {coinRowExtra}
      </View>
    </View>
  );
}

export function HomeLevelBar() {
  const { scale } = useResponsive();
  const { coins, xp, water, growthStage } = usePlayState();

  const ratio = useMemo(
    () => getStageRatio(water, xp, growthStage.level),
    [water, xp, growthStage.level],
  );
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
