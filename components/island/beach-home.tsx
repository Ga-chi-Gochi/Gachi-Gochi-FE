import { Image, type ImageSource } from 'expo-image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, View, useWindowDimensions } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { useIslandCameraStyle } from '@/components/island/island-camera';
import { useVolcanoEruption, LAVA_BOIL_MS, LAVA_FILL_MS, LAVA_SPILL_MS } from '@/components/island/volcano-eruption';
import {
  CELL,
  coastTiles,
  grassLawn,
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
  return grassLawn;
}

/** 겉 한 칸은 꽉 찬 모래 계단이다. 그보다 안쪽만 잔디다. */
function inland(x: number, y: number, isLand: (x: number, y: number) => boolean) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!isLand(x + dx, y + dy)) {
        return false;
      }
    }
  }
  return true;
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

/** 쉬는 분화구 안쪽. 아래 줄부터 한 줄씩 차오른다. */
const CRATER_SPANS = [
  { y: 14, x0: 52, x1: 70 },
  { y: 13, x0: 46, x1: 74 },
  { y: 12, x0: 42, x1: 76 },
  { y: 11, x0: 42, x1: 78 },
  { y: 10, x0: 40, x1: 82 },
  { y: 9, x0: 42, x1: 78 },
  { y: 8, x0: 40, x1: 80 },
  { y: 7, x0: 42, x1: 76 },
  { y: 6, x0: 42, x1: 78 },
  { y: 5, x0: 44, x1: 74 },
  { y: 4, x0: 44, x1: 72 },
  { y: 3, x0: 48, x1: 70 },
  { y: 2, x0: 50, x1: 68 },
];
const CRATER_MID = 60;
/** 겉은 식은 껍질, 속은 주황, 열기는 노랗다. */
const MAGMA_COLOR = {
  crust: '#6E1C0C',
  deep: '#D64016',
  body: '#FF8C20',
  hot: '#FFE460',
} as const;

type MagmaKind = keyof typeof MAGMA_COLOR;
type CraterPixel = { x: number; y: number; kind: MagmaKind; row: number; fromCenter: number };

const CRATER_PIXELS: CraterPixel[] = CRATER_SPANS.flatMap((span, row) => {
  const pixels: CraterPixel[] = [];
  for (let x = span.x0; x <= span.x1; x += 2) {
    const edge = x === span.x0 || x === span.x1 || span.y >= 13;
    const hot = !edge && (x + span.y) % 8 === 0;
    const kind: MagmaKind = edge ? 'crust' : span.y >= 11 ? 'deep' : hot ? 'hot' : 'body';
    pixels.push({ x, y: span.y, kind, row, fromCenter: Math.abs(x - CRATER_MID) / 24 });
  }
  return pixels;
});

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

/** 구름이 피어나는 화구. 섬 배치 좌표다. */
export function craterCloudPoint(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0 };
  }
  const origin = volcanoOrigin(width, height);
  return {
    x: (origin.x + VOLCANO_COLS / 2) * CELL,
    y: origin.y * CELL + 6,
  };
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
      const meadow = inland(x, y, isLand);
      cells.push({
        key: keyOf(x, y),
        x,
        y,
        kind: meadow ? 'grass' : 'sand',
        rim: meadow ? undefined : 'fill',
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
  const { shaking, boiling, token, calm, openFog } = useVolcanoEruption();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [box, setBox] = useState({ width: windowWidth, height: windowHeight });
  const growingZoneId = zoneUnlockReveal?.zoneId ?? null;
  const cells = useMemo(
    () => buildIslandCells(box.width, box.height, unlockedZones, growingZoneId),
    [box.height, box.width, growingZoneId, unlockedZones],
  );
  const volcano = useMemo(() => {
    if (box.width === 0 || box.height === 0) {
      return { origin: { x: 0, y: 0 }, tiles: [] };
    }
    const origin = volcanoOrigin(box.width, box.height);
    return {
      origin,
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
        <Quake active={shaking}>
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
        {volcano.tiles.map((tile) => (
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
        ))}
        <LavaRise
          key={token}
          active={boiling}
          originX={volcano.origin.x * CELL}
          originY={volcano.origin.y * CELL}
          onCalm={calm}
          onSpilled={openFog}
        />
        </Quake>
      </Reanimated.View>
    </View>
  );
}

function spills(pixel: CraterPixel) {
  return pixel.y <= 4 || (pixel.kind === 'crust' && pixel.y <= 6);
}

function magmaColor(pixel: CraterPixel, surface: boolean, elapsed: number) {
  if (pixel.kind === 'crust') {
    return MAGMA_COLOR.crust;
  }
  const flicker = Math.sin(elapsed / 90 + pixel.x * 0.45 + pixel.y) > 0.35;
  if (surface || pixel.kind === 'hot') {
    return flicker ? MAGMA_COLOR.hot : MAGMA_COLOR.body;
  }
  if (pixel.kind === 'deep') {
    return flicker && pixel.y < 13 ? MAGMA_COLOR.body : MAGMA_COLOR.deep;
  }
  return flicker ? MAGMA_COLOR.deep : MAGMA_COLOR.body;
}

function LavaRise({
  active,
  originX,
  originY,
  onCalm,
  onSpilled,
}: {
  active: boolean;
  originX: number;
  originY: number;
  onCalm: () => void;
  onSpilled: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }
    const started = performance.now();
    let frame = 0;
    let calmed = false;
    let spilled = false;
    const burstAt = LAVA_FILL_MS + LAVA_BOIL_MS;
    const tick = (now: number) => {
      const next = now - started;
      setElapsed(next);
      if (!calmed && next >= burstAt) {
        calmed = true;
        onCalm();
      }
      if (!spilled && next >= burstAt + LAVA_SPILL_MS) {
        spilled = true;
        onSpilled();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, onCalm, onSpilled]);

  if (!active) {
    return null;
  }
  const fill = surgeFill(elapsed / LAVA_FILL_MS);
  const boiling = elapsed >= LAVA_FILL_MS && elapsed < LAVA_FILL_MS + LAVA_BOIL_MS;
  const spill = Math.max(0, Math.min(1, (elapsed - LAVA_FILL_MS - LAVA_BOIL_MS) / LAVA_SPILL_MS));
  const rowProgress = fill * CRATER_SPANS.length;
  const fullRows = Math.floor(rowProgress);
  const partial = rowProgress - fullRows;
  const surfaceRow = Math.min(CRATER_SPANS.length - 1, fullRows);
  return (
    <>
      {CRATER_PIXELS.map((pixel) => {
        const shown = pixel.row < fullRows || (pixel.row === fullRows && pixel.fromCenter <= partial);
        if (!shown) {
          return null;
        }
        const onSurface = pixel.row >= surfaceRow - 2 || (boiling && pixel.y <= 6);
        const wave = Math.sin(elapsed / 60 + pixel.x * 0.65 + pixel.y * 0.35);
        const bubble = onSurface && wave > 0.2;
        const pop = onSurface && Math.sin(elapsed / 130 + pixel.x * 1.4) > 0.55;
        const bob = pop ? 4 : bubble ? 2 : 0;
        const overflow = spill > 0 && spills(pixel);
        const lift = 5 + (1 - Math.min(1, Math.abs(pixel.x - CRATER_MID) / 18)) * 9;
        const fade = overflow && spill > 0.72 ? 1 - (spill - 0.72) / 0.28 : 1;
        return (
          <View
            key={`${pixel.x}-${pixel.y}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: originX + pixel.x + (overflow ? Math.sign(pixel.x - CRATER_MID) * 3 * spill : 0),
              top: originY + pixel.y - bob - (overflow ? lift * spill : 0),
              width: 2,
              height: 2,
              opacity: fade,
              backgroundColor: magmaColor(pixel, onSurface, elapsed),
            }}
          />
        );
      })}
    </>
  );
}

/** 세 번 꿀렁이며 차오른다. 각 구간은 빠르게 올랐다가 잠깐 잦아든다. */
function surgeFill(amount: number) {
  const t = Math.min(1, Math.max(0, amount));
  const gulps = 3;
  const scaled = t * gulps;
  const index = Math.min(gulps - 1, Math.floor(scaled));
  const local = scaled - index;
  const eased = 1 - (1 - local) ** 2;
  return Math.min(1, (index + eased) / gulps);
}

function Quake({ active, children }: { active: boolean; children: ReactNode }) {
  const [shift] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      shift.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shift, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shift, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shift, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]),
      { iterations: 20 },
    );
    anim.start();
    return () => anim.stop();
  }, [active, shift]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, transform: [{ translateX: shift }] }}>
      {children}
    </Animated.View>
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
