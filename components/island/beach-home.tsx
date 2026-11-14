import { Image, type ImageSource } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, View, useWindowDimensions } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { useIslandCameraStyle } from '@/components/island/island-camera';
import {
  CELL,
  coastTiles,
  grassDarkField,
  grassField,
  sandBeach,
  seaTiles,
} from '@/components/island/beach-tiles';
import { usePlayState } from '@/components/play-state';
import type { IslandZoneId } from '@/constants/island-zones';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type LandKind = 'grass' | 'grassDark' | 'sand';

type IslandCell = {
  key: string;
  x: number;
  y: number;
  kind: LandKind | 'coast';
  /** 해안기 줄. 0이 모래와 맞닿고 4가 깊은 바다 쪽이다. */
  coastRow?: number;
  /** 해안기 1–5 중 몇 번째인지. 같은 가로 위치는 같은 장을 쓴다. */
  coastCol?: number;
  /** 넓히기로 새로 생긴 칸. 가운데에서 멀수록 늦게 올라온다. */
  riseDelay?: number;
};

const LAND_SOURCE: Record<LandKind, ImageSource> = {
  grass: grassField,
  grassDark: grassDarkField,
  sand: sandBeach,
};

/** 해안 타일 줄 수. 해안기 0부터 4까지. 섬 남쪽 아래에만 붙인다. */
const COAST_ROWS = coastTiles.length;

/** 이 값보다 아래인 남쪽 가장자리에만 파도를 붙인다. */
const SOUTH_SHORE = 0.28;

type IslandFrame = { cx: number; cy: number; rx: number; ry: number };

function tileSource(cell: IslandCell): ImageSource {
  if (cell.kind === 'coast') {
    return coastTiles[cell.coastRow ?? 0][cell.coastCol ?? 0];
  }
  return LAND_SOURCE[cell.kind];
}

/** 가로와 세로가 거의 같은 둥근 섬. 조금만 넓다. */
function islandFrame(width: number, height: number): IslandFrame {
  const radius = Math.min(width, height) * 0.42;
  return {
    cx: width * 0.5,
    cy: height * 0.46,
    rx: radius * 1.05,
    ry: radius,
  };
}

/** 굴곡은 얕아서 원에서 크게 벗어나지 않는다. */
function coastLimit(angle: number) {
  return 1 + 0.035 * Math.sin(angle) + 0.05 * Math.sin(2 * angle + 0.4);
}

function insideCore(nx: number, ny: number) {
  return Math.hypot(nx, ny) <= coastLimit(Math.atan2(ny, nx));
}

/** 중앙 섬 반지름을 1로 둔 붙는 땅. */
const ZONE_LOBE: Record<Exclude<IslandZoneId, 'core'>, { ox: number; oy: number; rx: number; ry: number }> = {
  east: { ox: 0.92, oy: 0.02, rx: 0.72, ry: 0.7 },
  west: { ox: -0.92, oy: 0, rx: 0.7, ry: 0.68 },
  north: { ox: 0.02, oy: -0.95, rx: 0.7, ry: 0.72 },
  south: { ox: 0, oy: 0.98, rx: 0.74, ry: 0.62 },
};

function insideLobe(nx: number, ny: number, zoneId: Exclude<IslandZoneId, 'core'>) {
  const lobe = ZONE_LOBE[zoneId];
  const dx = (nx - lobe.ox) / lobe.rx;
  const dy = (ny - lobe.oy) / lobe.ry;
  return dx * dx + dy * dy <= 1;
}

function insideZones(nx: number, ny: number, zones: readonly IslandZoneId[]) {
  if (insideCore(nx, ny)) {
    return true;
  }
  return zones.some((zoneId) => zoneId !== 'core' && insideLobe(nx, ny, zoneId));
}

/** 위는 연한 잔디, 가운데는 진한 잔디 띠, 아래는 모래. */
function landKind(ny: number): LandKind {
  if (ny >= 0.22) {
    return 'sand';
  }
  if (ny >= -0.12) {
    return 'grassDark';
  }
  return 'grass';
}

const keyOf = (x: number, y: number) => `${x},${y}`;

function delayFor(x: number, y: number, cx: number, cy: number) {
  const dist = Math.hypot((x + 0.5) * CELL - cx, (y + 0.5) * CELL - cy);
  return 160 + Math.floor(dist / CELL) * 28;
}

function smoothCoast(land: Set<string>, minX: number, maxX: number, minY: number, maxY: number) {
  const next = new Set(land);
  const has = (x: number, y: number) => land.has(keyOf(x, y));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const neighbors = [has(x, y - 1), has(x, y + 1), has(x - 1, y), has(x + 1, y)].filter(Boolean).length;
      if (has(x, y) && neighbors <= 1) {
        next.delete(keyOf(x, y));
      }
    }
  }
  return next;
}

/** 알이 서는 모래. 둥근 섬의 아래쪽 모래 위다. */
export function sandStandY(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return 0;
  }
  const { cy, ry } = islandFrame(width, height);
  return cy + ry * 0.62;
}

/**
 * 약간 둥근 섬. 속은 잔디·진한 잔디·모래 층이고, 남쪽 아래에만 해안기 0–4를 붙인다.
 * 새로 열린 구역의 칸은 가운데에서 바깥으로 떠오른다.
 */
function buildIslandCells(width: number, height: number, zones: readonly IslandZoneId[], growingZoneId: IslandZoneId | null): IslandCell[] {
  if (width === 0 || height === 0) {
    return [];
  }
  const { cx, cy, rx, ry } = islandFrame(width, height);
  const cols = Math.ceil(width / CELL);
  const reach = 2.2;
  const minX = Math.max(0, Math.floor((cx - rx * reach) / CELL) - 1);
  const maxX = Math.min(cols - 1, Math.ceil((cx + rx * reach) / CELL) + 1);
  const minY = Math.max(0, Math.floor((cy - ry * reach) / CELL) - 1);
  const maxY = Math.ceil((cy + ry * reach) / CELL) + COAST_ROWS + 1;
  const growing = growingZoneId && growingZoneId !== 'core' ? growingZoneId : null;
  const settledZones = zones.filter((zoneId) => zoneId !== growing);
  const fullZones = growing ? [...settledZones, growing] : settledZones;

  const collect = (zoneList: readonly IslandZoneId[]) => {
    const set = new Set<string>();
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const nx = ((x + 0.5) * CELL - cx) / rx;
        const ny = ((y + 0.5) * CELL - cy) / ry;
        if (insideZones(nx, ny, zoneList)) {
          set.add(keyOf(x, y));
        }
      }
    }
    return smoothCoast(set, minX, maxX, minY, maxY);
  };

  const settled = collect(settledZones);
  const land = growing ? collect(fullZones) : settled;
  const isLand = (x: number, y: number) => land.has(keyOf(x, y));
  const cells: IslandCell[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!isLand(x, y)) {
        continue;
      }
      const ny = ((y + 0.5) * CELL - cy) / ry;
      const fresh = growing != null && !settled.has(keyOf(x, y));
      cells.push({
        key: keyOf(x, y),
        x,
        y,
        kind: landKind(ny),
        riseDelay: fresh ? delayFor(x, y, cx, cy) : undefined,
      });
    }
  }

  for (let x = minX; x <= maxX; x += 1) {
    let southY = -1;
    for (let y = minY; y <= maxY; y += 1) {
      if (isLand(x, y)) {
        southY = y;
      }
    }
    if (southY < 0) {
      continue;
    }
    const ny = ((southY + 0.5) * CELL - cy) / ry;
    if (ny < SOUTH_SHORE) {
      continue;
    }
    const coastCol = ((x % seaTiles.length) + seaTiles.length) % seaTiles.length;
    const fresh = growing != null && !settled.has(keyOf(x, southY));
    for (let row = 0; row < COAST_ROWS; row += 1) {
      const y = southY + 1 + row;
      if (isLand(x, y)) {
        continue;
      }
      cells.push({
        key: `coast-${x},${y}`,
        x,
        y,
        kind: 'coast',
        coastRow: row,
        coastCol,
        riseDelay: fresh ? delayFor(x, y, cx, cy) : undefined,
      });
    }
  }

  return cells;
}

export function BeachHome() {
  const cameraStyle = useIslandCameraStyle();
  const { unlockedZones, zoneUnlockReveal } = usePlayState();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [box, setBox] = useState({ width: windowWidth, height: windowHeight });
  const growingZoneId = zoneUnlockReveal?.zoneId ?? null;
  const cells = useMemo(
    () => buildIslandCells(box.width, box.height, unlockedZones, growingZoneId),
    [box.height, box.width, growingZoneId, unlockedZones],
  );

  return (
    <View
      pointerEvents="none"
      style={{ flex: 1 }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}>
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} pointerEvents="none">
        <SeaFill />
      </View>
      <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, cameraStyle]}>
        {cells.map((cell) =>
          cell.riseDelay == null ? (
            <Image
              key={cell.key}
              source={tileSource(cell)}
              pointerEvents="none"
              transition={0}
              style={{
                position: 'absolute',
                left: cell.x * CELL,
                top: cell.y * CELL,
                width: CELL,
                height: CELL,
                ...pixelImageStyle,
              }}
              contentFit="fill"
            />
          ) : (
            <RisingCell key={cell.key} cell={cell} />
          ),
        )}
      </Reanimated.View>
    </View>
  );
}

function useRise(delay: number | null) {
  const [value] = useState(() => new Animated.Value(delay == null ? 1 : 0));

  useEffect(() => {
    if (delay == null) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const anim = Animated.timing(value, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, value]);

  return {
    opacity: value,
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
  };
}

function RisingCell({ cell }: { cell: IslandCell }) {
  const rise = useRise(cell.riseDelay ?? null);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cell.x * CELL,
        top: cell.y * CELL,
        width: CELL,
        height: CELL,
        ...rise,
      }}>
      <Image
        source={tileSource(cell)}
        transition={0}
        style={{ width: CELL, height: CELL, ...pixelImageStyle }}
        contentFit="fill"
      />
    </Animated.View>
  );
}

/** 화면 전체의 깊은 바다. 확대해도 이 층은 움직이지 않는다. */
function SeaFill() {
  const { width, height: windowHeight } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const height = Math.max(windowHeight, measured);
  const cols = Math.max(1, Math.ceil(width / CELL));
  const rows = Math.max(1, Math.ceil(height / CELL));

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => {
        const next = Math.ceil(event.nativeEvent.layout.height);
        setMeasured((current) => (current === next ? current : next));
      }}>
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {Array.from({ length: cols }, (_, col) => (
            <Image
              key={col}
              source={seaTiles[col % seaTiles.length]}
              transition={0}
              style={{ width: CELL, height: CELL, ...pixelImageStyle }}
              contentFit="fill"
            />
          ))}
        </View>
      ))}
    </View>
  );
}
