import { Image, type ImageSource } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, View, useWindowDimensions } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { useIslandCameraStyle } from '@/components/island/island-camera';
import { useVolcanoEruption } from '@/components/island/volcano-eruption';
import { VolcanoSprite, volcanoSpriteSize } from '@/components/island/volcano-sprite';
import {
  CELL,
  coastTiles,
  grassField,
  sandCornerSe,
  sandCornerSw,
  sandEdgeE,
  sandEdgeN,
  sandEdgeW,
  sandFill,
  seaTiles,
  volcanoCellRows,
} from '@/components/island/beach-tiles';
import { usePlayState } from '@/components/play-state';
import type { IslandZoneId } from '@/constants/island-zones';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type LandKind = 'grass' | 'sand';
/** 남쪽은 꽉 찬 모래. 그 외 가장자리는 바깥이 비어 있는 타일로 둥글게 깎는다. */
type SandRim = 'fill' | 'n' | 'e' | 'w' | 'ne' | 'nw';

type IslandCell = {
  key: string;
  x: number;
  y: number;
  kind: LandKind | 'coast';
  rim?: SandRim;
  /** 해안기 줄. 0이 모래와 맞닿고 4가 깊은 바다 쪽이다. */
  coastRow?: number;
  /** 해안기 1–5 중 몇 번째인지. 같은 가로 위치는 같은 장을 쓴다. */
  coastCol?: number;
  /** 넓히기로 새로 생긴 칸. 가운데에서 멀수록 늦게 올라온다. */
  riseDelay?: number;
};


/** 해안 타일 줄 수. 해안기 0부터 4까지. 섬 남쪽 아래에만 붙인다. */
const COAST_ROWS = coastTiles.length;

/** 이 값보다 아래인 남쪽 가장자리에만 파도를 붙인다. */
const SOUTH_SHORE = 0.4;

const SAND_RIM: Record<SandRim, ImageSource> = {
  fill: sandFill,
  n: sandEdgeN,
  e: sandEdgeE,
  w: sandEdgeW,
  ne: sandCornerSw,
  nw: sandCornerSe,
};

type IslandFrame = { cx: number; cy: number; rx: number; ry: number };

function tileSource(cell: IslandCell): ImageSource {
  if (cell.kind === 'coast') {
    return coastTiles[cell.coastRow ?? 0][cell.coastCol ?? 0];
  }
  if (cell.kind === 'sand') {
    return SAND_RIM[cell.rim ?? 'fill'];
  }
  return grassField;
}

/** 직선 바깥면만 둥근 모래. 모서리와 남쪽, 안쪽 해변은 빈틈 없는 모래다. */
function sandRim(x: number, y: number, isLand: (x: number, y: number) => boolean): SandRim {
  const openN = !isLand(x, y - 1);
  const openS = !isLand(x, y + 1);
  const openE = !isLand(x + 1, y);
  const openW = !isLand(x - 1, y);
  if (openS) {
    return 'fill';
  }
  if (openN && !openE && !openW) {
    return 'n';
  }
  if (openE && !openN && !openW) {
    return 'e';
  }
  if (openW && !openN && !openE) {
    return 'w';
  }
  return 'fill';
}

function enclosed(x: number, y: number, isLand: (x: number, y: number) => boolean) {
  return isLand(x, y - 1) && isLand(x, y + 1) && isLand(x - 1, y) && isLand(x + 1, y);
}

/** 화면 안에서 거의 원인 섬. 반 칸을 어긋내 격자 위에서도 위아래가 좁아지게 한다. */
function islandFrame(width: number, height: number): IslandFrame {
  const radius = Math.min(width, height) * 0.42;
  return {
    cx: width * 0.5 + CELL / 2,
    cy: height * 0.46,
    rx: radius,
    ry: radius,
  };
}

function insideCore(nx: number, ny: number) {
  return nx * nx + ny * ny <= 1;
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

const keyOf = (x: number, y: number) => `${x},${y}`;

function delayFor(x: number, y: number, cx: number, cy: number) {
  const dist = Math.hypot((x + 0.5) * CELL - cx, (y + 0.5) * CELL - cy);
  return 160 + Math.floor(dist / CELL) * 28;
}

/** 튀어나온 칸은 지우고, 파고든 한 칸은 채워 실루엣을 고르게 만든다. */
function evenCoast(land: Set<string>, minX: number, maxX: number, minY: number, maxY: number) {
  let current = land;
  for (let pass = 0; pass < 2; pass += 1) {
    const next = new Set(current);
    const has = (x: number, y: number) => current.has(keyOf(x, y));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const neighbors = [has(x, y - 1), has(x, y + 1), has(x - 1, y), has(x + 1, y)].filter(Boolean).length;
        if (has(x, y) && neighbors <= 1) {
          next.delete(keyOf(x, y));
        } else if (!has(x, y) && neighbors >= 3) {
          next.add(keyOf(x, y));
        }
      }
    }
    current = next;
  }
  return current;
}

/** 알이 서는 잔디. 휴화산 바로 남쪽이다. */
const VOLCANO_COLS = volcanoCellRows[0].length;
const VOLCANO_ROWS = volcanoCellRows.length;

function volcanoOrigin(width: number, height: number) {
  const { cx, cy } = islandFrame(width, height);
  return {
    x: Math.floor(cx / CELL) - Math.floor(VOLCANO_COLS / 2),
    y: Math.floor(cy / CELL) - (VOLCANO_ROWS - 1),
  };
}

export function volcanoMouthPoint(width: number, height: number) {
  const { cx, cy } = islandFrame(width, height);
  return { x: cx, y: cy - CELL * 0.5 };
}

export function sandStandX(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return 0;
  }
  const origin = volcanoOrigin(width, height);
  return (origin.x + VOLCANO_COLS / 2) * CELL;
}

export function sandStandY(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return 0;
  }
  const origin = volcanoOrigin(width, height);
  return (origin.y + VOLCANO_ROWS + 0.5) * CELL;
}

/**
 * 거의 원인 땅. 속은 잔디, 모래 테두리는 사방이 한 칸이다.
 * 파도는 남쪽 둥근 바닥 아래에만 붙인다.
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
    return evenCoast(set, minX, maxX, minY, maxY);
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
      const fresh = growing != null && !settled.has(keyOf(x, y));
      const meadow = enclosed(x, y, isLand);
      cells.push({
        key: keyOf(x, y),
        x,
        y,
        kind: meadow ? 'grass' : 'sand',
        rim: meadow ? undefined : sandRim(x, y, isLand),
        riseDelay: fresh ? delayFor(x, y, cx, cy) : undefined,
      });
    }
  }

  const shores: { x: number; southY: number }[] = [];
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
    shores.push({ x, southY });
  }
  for (const shore of shores) {
    const fresh = growing != null && !settled.has(keyOf(shore.x, shore.southY));
    const coastCol = ((shore.x % seaTiles.length) + seaTiles.length) % seaTiles.length;
    for (let row = 0; row < COAST_ROWS; row += 1) {
      const y = shore.southY + 1 + row;
      if (isLand(shore.x, y)) {
        continue;
      }
      cells.push({
        key: `coast-${shore.x},${y}`,
        x: shore.x,
        y,
        kind: 'coast',
        coastRow: row,
        coastCol,
        riseDelay: fresh ? delayFor(shore.x, y, cx, cy) : undefined,
      });
    }
  }

  return cells;
}

export function BeachHome() {
  const cameraStyle = useIslandCameraStyle();
  const { unlockedZones, zoneUnlockReveal } = usePlayState();
  const { token, phase } = useVolcanoEruption();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [box, setBox] = useState({ width: windowWidth, height: windowHeight });
  const erupting = phase === 'erupt';
  const growingZoneId = zoneUnlockReveal?.zoneId ?? null;
  const cells = useMemo(
    () => buildIslandCells(box.width, box.height, unlockedZones, growingZoneId),
    [box.height, box.width, growingZoneId, unlockedZones],
  );
  const volcano = useMemo(() => {
    if (box.width === 0 || box.height === 0) {
      return { tiles: [], left: 0, top: 0 };
    }
    const origin = volcanoOrigin(box.width, box.height);
    return {
      left: origin.x * CELL,
      top: origin.y * CELL - volcanoSpriteSize.pad,
      tiles: volcanoCellRows.flatMap((row, rowIndex) =>
        row.map((source, colIndex) => ({
          key: `volcano-${rowIndex}-${colIndex}`,
          x: origin.x + colIndex,
          y: origin.y + rowIndex,
          source,
        })),
      ),
    };
  }, [box.height, box.width]);

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
        {erupting ? (
          <VolcanoSprite left={volcano.left} top={volcano.top} playToken={token} />
        ) : (
          volcano.tiles.map((tile) => (
            <Image
              key={tile.key}
              source={tile.source}
              pointerEvents="none"
              transition={0}
              style={{
                position: 'absolute',
                left: tile.x * CELL,
                top: tile.y * CELL,
                width: CELL,
                height: CELL,
                ...pixelImageStyle,
              }}
              contentFit="fill"
            />
          ))
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
