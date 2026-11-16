import { Image, type ImageSource } from 'expo-image';
import { type ComponentRef, memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  volcanoCellRows,
} from '@/components/island/beach-tiles';
import { FoamSegment } from '@/components/island/foam-band';
import { foamFrameForLag, seaFrameForLag, sparkleFrameForLag, useSeaClock, waveLag } from '@/components/island/sea-clock';
import { SheetSprite } from '@/components/island/sheet-sprite';
import { usePlayState } from '@/components/play-state';
import { MOTION_SEQ, SEA_TINT_SHEETS, type MotionSheet } from '@/constants/island-motion';
import type { IslandZoneId } from '@/constants/island-zones';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

const DEEP_SHEET: MotionSheet = SEA_TINT_SHEETS.deep;
const SHORE_SHEET = MOTION_SEQ['sea-shore'].sheet;
const SHALLOW_SHEET = MOTION_SEQ['sea-shallow'].sheet;

type ShoreStyle = 'tiles' | 'pixel' | 'slices' | 'ramp';
const SHORE_STYLE = 'ramp' as ShoreStyle;
const SLICE_PX = 8;
const SLICE_OVERLAP = 4;
const SLICE_FADE_PX = 24;
const SLICE_FOAM_LINES = false;
const SLICE_ROWS = 5;

type ShoreSlice = { x: number; top: number; opacity: number };

const RAMP_PX = 2;
const RAMP_BLOCK = 32;
const RAMP_SHEETS: readonly MotionSheet[] = [SEA_TINT_SHEETS.t1, SEA_TINT_SHEETS.t2, SEA_TINT_SHEETS.t3];
const RAMP_COLORS = ['#45BBB1', '#30AAA5', '#249793'] as const;
const RAMP_DEEP_COLOR = '#1C8481';
const RAMP_STEPS = [14, 28, 44] as const;
const RAMP_DITHER = 2;
const RAMP_EMPTY: number = RAMP_STEPS.length;
const RAMP_FREE = -1;
const RAMP_SPARKLE_COLOR = '#E7FFFD';
const RAMP_SPARKLE_REACH = 24;
const RAMP_SPARKLE_EVERY = 151;
const RAMP_SPARKLE_PHASES = 4;

type RampBlock = { key: string; x: number; y: number; stage: number; size: number };
type ShallowRamp = { blocks: RampBlock[]; dots: SurfaceGrain[]; sparkles: { key: string; x: number; y: number; lag: number }[] };
type PixelBounds = { x0: number; x1: number; y0: number; y1: number };
type ShoreWater = { slices: ShoreSlice[]; ramp: ShallowRamp };

const CORE_REACH = 1.3;
const REVEAL_MS = 380;

type RevealOrigin = { cx: number; cy: number };
type Reveal<T> = { stay: T[]; gone: [number, T[]][]; fresh: [number, T[]][] };

function revealDelay(x: number, y: number, origin: RevealOrigin) {
  return 160 + Math.floor(Math.hypot(x - origin.cx, y - origin.cy) / CELL) * 28;
}

function splitReveal<T>(after: readonly T[], before: readonly T[] | undefined, id: (item: T) => string, delayOf: (item: T) => number): Reveal<T> {
  if (!before) {
    return { stay: [...after], gone: [], fresh: [] };
  }
  const beforeIds = new Set(before.map(id));
  const afterIds = new Set(after.map(id));
  const group = (items: T[]) => {
    const byDelay = new Map<number, T[]>();
    for (const item of items) {
      const delay = delayOf(item);
      const list = byDelay.get(delay);
      if (list) {
        list.push(item);
      } else {
        byDelay.set(delay, [item]);
      }
    }
    return [...byDelay.entries()].sort((a, b) => a[0] - b[0]);
  };
  return {
    stay: after.filter((item) => beforeIds.has(id(item))),
    gone: group(before.filter((item) => !afterIds.has(id(item)))),
    fresh: group(after.filter((item) => !beforeIds.has(id(item)))),
  };
}

function shoreHeight(slice: ShoreSlice) {
  if (slice.opacity >= 1) {
    return CELL;
  }
  return Math.max(RAMP_PX * 2, Math.round((CELL * slice.opacity) / RAMP_PX) * RAMP_PX);
}

const FOAM_KEY = /^(foam|wash|bubble)-/;
const FOAM_SEGMENT_PX = 16;

const ANIMATED_COAST_SHEETS: Partial<Record<number, MotionSheet>> = {
  0: SHORE_SHEET,
  3: SHALLOW_SHEET,
  4: DEEP_SHEET,
};

function animatedSheet(cell: { kind: string; coastRow?: number }): MotionSheet | undefined {
  return cell.kind === 'coast' ? ANIMATED_COAST_SHEETS[cell.coastRow ?? 0] : undefined;
}

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
  /** 잔디 타일 대신 모서리를 작은 픽셀로 칠한다. */
  fine?: boolean;
};

type SurfaceGrain = {
  key: string;
  x: number;
  y: number;
  size: number;
  height?: number;
  color: string;
};

/** 개발 중 비교용. 1은 넓은 섬, 2는 기울어진 제주도, 3은 세로로 긴 섬이다. */
export type IslandLook = 1 | 2 | 3;

/** 화면에 보여줄 섬. 2와 3은 지우지 않고 잠깐 숨긴다. */
export const VISIBLE_ISLAND_LOOKS: readonly IslandLook[] = [1];

/** 모서리 계단. 바다와 맞닿는 자리는 이 절반으로 한 번 더 나눈다. */
const EDGE = 4;
const SAND_COLORS = ['#E6D4A6', '#F2E2B6', '#D8C48E', '#CDB888'] as const;
const TUFT_COLORS = ['#6E9448', '#8FB85C', '#B7D488', '#D3E7A4', '#5C8438'] as const;


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

/** 해안선을 따라 얇게 두는 모래. */
const SAND_PX = 14;

function onIsland(px: number, py: number, cx: number, cy: number, rx: number, ry: number, zones: readonly IslandZoneId[]) {
  return insideZones((px - cx) / rx, (py - cy) / ry, zones);
}

function shoreSand(px: number, py: number, cx: number, cy: number, rx: number, ry: number, zones: readonly IslandZoneId[]) {
  if (!onIsland(px, py, cx, cy, rx, ry, zones)) {
    return false;
  }
  const dx = px - cx;
  const dy = py - cy;
  const len = Math.hypot(dx, dy) || 1;
  return !onIsland(px + (dx / len) * SAND_PX, py + (dy / len) * SAND_PX, cx, cy, rx, ry, zones);
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

/** 오른쪽은 좁아지고 왼쪽은 조금 더 볼록한, 들쑥날쑥한 해안. */
function coastRadius(angle: number) {
  const east = Math.cos(angle);
  const south = Math.sin(angle);
  return (
    1 +
    0.05 * Math.sin(2 * angle + 0.5) +
    0.07 * Math.sin(3 * angle - 0.7) +
    0.035 * Math.sin(5 * angle + 1.1) +
    0.02 * Math.sin(8 * angle - 0.3) -
    0.22 * Math.max(0, east) ** 2 +
    0.08 * Math.max(0, -east) * (0.4 + Math.max(0, south))
  );
}

function insideCore(nx: number, ny: number) {
  const angle = Math.atan2(ny, nx);
  return Math.hypot(nx, ny) <= coastRadius(angle);
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

type LandShape = { cx: number; cy: number; rx: number; ry: number };

function landShape(width: number, height: number): LandShape {
  const { cx, cy, rx: radius } = islandFrame(width, height);
  return { cx, cy, rx: radius, ry: radius * 0.7 };
}

function landCell(x: number, y: number, shape: LandShape, zones: readonly IslandZoneId[]) {
  const nx = ((x + 0.5) * CELL - shape.cx) / shape.rx;
  const ny = ((y + 0.5) * CELL - shape.cy) / shape.ry;
  return insideZones(nx, ny, zones);
}

const keyOf = (x: number, y: number) => `${x},${y}`;

function delayFor(x: number, y: number, cx: number, cy: number) {
  const dist = Math.hypot((x + 0.5) * CELL - cx, (y + 0.5) * CELL - cy);
  return 160 + Math.floor(dist / CELL) * 28;
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

export function isWalkable(px: number, py: number, width: number, height: number, zones: readonly IslandZoneId[]) {
  if (width <= 0 || height <= 0) {
    return false;
  }
  const x = Math.floor(px / CELL);
  const y = Math.floor(py / CELL);
  if (x < 0 || y < 0 || x >= Math.ceil(width / CELL)) {
    return false;
  }
  if (!landCell(x, y, landShape(width, height), zones)) {
    return false;
  }
  const origin = volcanoOrigin(width, height);
  const nearVolcano = x >= origin.x - 1 && x <= origin.x + VOLCANO_COLS && y >= origin.y - 1 && y <= origin.y + VOLCANO_ROWS;
  return !nearVolcano;
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
 * 가로로 넓은 땅. 속은 잔디이고, 모래는 해안선을 따라 얇게 두른다.
 * 파도는 남쪽 해안선의 굽이를 따라 붙인다.
 */
function buildIslandCells(
  width: number,
  height: number,
  zones: readonly IslandZoneId[],
  growingZoneId: IslandZoneId | null,
  look: IslandLook,
): { cells: IslandCell[]; grains: SurfaceGrain[]; slices?: ShoreSlice[]; ramp?: ShallowRamp; before?: ShoreWater } {
  if (width === 0 || height === 0) {
    return { cells: [], grains: [] };
  }
  if (look === 3) {
    return buildPlaque(width, height);
  }
  if (look === 2) {
    return buildJeju(width, height);
  }
  const shape = landShape(width, height);
  const { cx, cy, rx, ry } = shape;
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
        if (landCell(x, y, shape, zoneList)) {
          set.add(keyOf(x, y));
        }
      }
    }
    return set;
  };

  const settled = collect(settledZones);
  const land = growing ? collect(fullZones) : settled;
  const isLand = (x: number, y: number) => land.has(keyOf(x, y));
  const grassy = (px: number, py: number) =>
    onIsland(px, py, cx, cy, rx, ry, fullZones) && !shoreSand(px, py, cx, cy, rx, ry, fullZones);
  const cells: IslandCell[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!isLand(x, y)) {
        continue;
      }
      const fresh = growing != null && !settled.has(keyOf(x, y));
      const x0 = x * CELL;
      const y0 = y * CELL;
      const meadow = grassy(x0 + CELL / 2, y0 + CELL / 2);
      const fine = true;
      cells.push({
        key: keyOf(x, y),
        x,
        y,
        kind: meadow ? 'grass' : 'sand',
        rim: meadow ? undefined : 'fill',
        riseDelay: fresh ? delayFor(x, y, cx, cy) : undefined,
        fine,
      });
    }
  }

  const grains = buildSurfaceGrains(cells, cx, cy, rx, ry, fullZones);
  if (SHORE_STYLE === 'tiles') {
    cells.push(...buildCoastCells(minX, maxX, minY, maxY, isLand, (x, y) => growing != null && !settled.has(keyOf(x, y)), cx, cy, ry));
    return { cells, grains };
  }
  const landAt = (px: number, py: number) => {
    if (!insideZones((px - cx) / rx, (py - cy) / ry, fullZones)) {
      return false;
    }
    if (growing != null && !settled.has(keyOf(Math.floor(px / CELL), Math.floor(py / CELL)))) {
      return false;
    }
    return true;
  };
  const southEnough = (px: number, py: number) => (py - cy) / ry > SOUTH_SHORE;
  if (SHORE_STYLE === 'slices') {
    const slices = buildShoreSlices({ x0: minX * CELL, x1: (maxX + 1) * CELL, y0: minY * CELL, y1: (maxY + 1) * CELL }, landAt, southEnough);
    if (SLICE_FOAM_LINES) {
      const foam: SurfaceGrain[] = [];
      paintSouthFoam(foam, minX, maxX, minY, maxY, landAt, southEnough);
      grains.push(...foam.filter((grain) => grain.key.startsWith('foam-')));
    }
    return { cells, grains, slices };
  }
  if (SHORE_STYLE === 'ramp') {
    const water = cachedShoreWater(width, height, shape, fullZones, southEnough);
    if (!growing) {
      return { cells, grains, ...water };
    }
    const before = cachedShoreWater(width, height, shape, settledZones, southEnough);
    return { cells, grains, ...water, before };
  }
  paintSouthFoam(grains, minX, maxX, minY, maxY, landAt, southEnough);
  return { cells, grains };
}

function buildCoastCells(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  isLand: (x: number, y: number) => boolean,
  isFresh: (x: number, y: number) => boolean,
  cx: number,
  cy: number,
  ry: number,
): IslandCell[] {
  const coast: IslandCell[] = [];
  for (let x = minX; x <= maxX; x += 1) {
    let southY = -1;
    for (let y = minY; y <= maxY; y += 1) {
      if (isLand(x, y)) {
        southY = y;
      }
    }
    if (southY < 0 || ((southY + 0.5) * CELL - cy) / ry <= SOUTH_SHORE) {
      continue;
    }
    const fresh = isFresh(x, southY);
    for (let row = 0; row < COAST_ROWS; row += 1) {
      const y = southY + 1 + row;
      if (isLand(x, y)) {
        continue;
      }
      const tiles = coastTiles[row];
      coast.push({
        key: `coast-${x},${y}`,
        x,
        y,
        kind: 'coast',
        coastRow: row,
        coastCol: ((x % tiles.length) + tiles.length) % tiles.length,
        riseDelay: fresh ? delayFor(x, y, cx, cy) : undefined,
      });
    }
  }
  return coast;
}

function landBounds(shape: LandShape, zones: readonly IslandZoneId[]): PixelBounds {
  let nx0 = -CORE_REACH;
  let nx1 = CORE_REACH;
  let ny0 = -CORE_REACH;
  let ny1 = CORE_REACH;
  for (const zoneId of zones) {
    if (zoneId === 'core') {
      continue;
    }
    const lobe = ZONE_LOBE[zoneId];
    nx0 = Math.min(nx0, lobe.ox - lobe.rx);
    nx1 = Math.max(nx1, lobe.ox + lobe.rx);
    ny0 = Math.min(ny0, lobe.oy - lobe.ry);
    ny1 = Math.max(ny1, lobe.oy + lobe.ry);
  }
  return {
    x0: Math.floor((shape.cx + nx0 * shape.rx) / CELL - 1) * CELL,
    x1: Math.ceil((shape.cx + nx1 * shape.rx) / CELL + 1) * CELL,
    y0: Math.floor((shape.cy + ny0 * shape.ry) / CELL - 1) * CELL,
    y1: Math.ceil((shape.cy + ny1 * shape.ry) / CELL + 1) * CELL,
  };
}

const WATER_CACHE_SIZE = 6;
const waterCache = new Map<string, ShoreWater>();

function cachedShoreWater(
  width: number,
  height: number,
  shape: LandShape,
  zones: readonly IslandZoneId[],
  southEnough: (px: number, py: number) => boolean,
): ShoreWater {
  const key = `${width}x${height}:${[...zones].sort().join(',')}`;
  const hit = waterCache.get(key);
  if (hit) {
    return hit;
  }
  const { cx, cy, rx, ry } = shape;
  const water = buildShoreWater(landBounds(shape, zones), (px, py) => insideZones((px - cx) / rx, (py - cy) / ry, zones), southEnough, cx);
  waterCache.set(key, water);
  if (waterCache.size > WATER_CACHE_SIZE) {
    waterCache.delete(waterCache.keys().next().value as string);
  }
  return water;
}

function buildShoreWater(
  bounds: PixelBounds,
  landAt: (px: number, py: number) => boolean,
  southEnough: (px: number, py: number) => boolean,
  cx: number,
): ShoreWater {
  const slices = buildShoreSlices(bounds, landAt, southEnough);
  return { slices, ramp: buildShallowRamp(bounds, landAt, slices, cx) };
}

function buildShoreSlices(
  { x0, x1, y0, y1 }: PixelBounds,
  landAt: (px: number, py: number) => boolean,
  southEnough: (px: number, py: number) => boolean,
): ShoreSlice[] {
  const found: { x: number; top: number }[] = [];
  for (let x = x0; x < x1; x += SLICE_PX) {
    let edge = -1;
    let edgeX = x;
    for (let sx = x; sx < x + SLICE_PX; sx += WAVE) {
      for (let y = y0; y < y1; y += WAVE) {
        if (landAt(sx + 1, y + 1) && y > edge) {
          edge = y;
          edgeX = sx;
        }
      }
    }
    if (edge < 0 || !southEnough(edgeX + 1, edge + 1)) {
      continue;
    }
    found.push({ x, top: edge + WAVE - SLICE_OVERLAP });
  }
  const slices: ShoreSlice[] = [];
  for (let start = 0; start < found.length; ) {
    let end = start;
    while (end + 1 < found.length && found[end + 1].x === found[end].x + SLICE_PX) {
      end += 1;
    }
    const runLeft = found[start].x;
    const runRight = found[end].x + SLICE_PX;
    for (let i = start; i <= end; i += 1) {
      const { x, top } = found[i];
      const inset = Math.min(x - runLeft, runRight - (x + SLICE_PX)) + SLICE_PX / 2;
      slices.push({ x, top, opacity: Math.min(1, inset / SLICE_FADE_PX) });
    }
    start = end + 1;
  }
  return slices;
}

function rampStage(distance: number) {
  for (let stage = 0; stage < RAMP_STEPS.length; stage += 1) {
    if (distance < RAMP_STEPS[stage]) {
      return stage;
    }
  }
  return RAMP_EMPTY;
}

function rampColor(stage: number) {
  return stage === RAMP_EMPTY ? RAMP_DEEP_COLOR : RAMP_COLORS[stage];
}

function buildShallowRamp(bounds: PixelBounds, landAt: (px: number, py: number) => boolean, slices: ShoreSlice[], cx: number): ShallowRamp {
  const outer = Math.ceil((RAMP_STEPS[RAMP_STEPS.length - 1] + RAMP_DITHER) / RAMP_BLOCK) * RAMP_BLOCK + RAMP_BLOCK;
  const x0 = bounds.x0 - outer;
  const x1 = bounds.x1 + outer;
  const y0 = bounds.y0 - outer;
  const y1 = bounds.y1 + outer + CELL;
  const cols = Math.ceil((x1 - x0) / RAMP_PX);
  const rows = Math.ceil((y1 - y0) / RAMP_PX);
  const far = Number.POSITIVE_INFINITY;
  const dist = new Float32Array(cols * rows).fill(far);
  const land = new Uint8Array(cols * rows);
  const shore = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (landAt(x0 + col * RAMP_PX + 1, y0 + row * RAMP_PX + 1)) {
        land[row * cols + col] = 1;
        dist[row * cols + col] = 0;
      }
    }
  }
  for (const slice of slices) {
    const c0 = Math.max(0, Math.floor((slice.x - x0) / RAMP_PX));
    const c1 = Math.min(cols, Math.ceil((slice.x + SLICE_PX - x0) / RAMP_PX));
    const r0 = Math.max(0, Math.floor((slice.top - y0) / RAMP_PX));
    const r1 = Math.min(rows, Math.ceil((slice.top + shoreHeight(slice) - y0) / RAMP_PX));
    for (let row = r0; row < r1; row += 1) {
      for (let col = c0; col < c1; col += 1) {
        shore[row * cols + col] = 1;
        dist[row * cols + col] = 0;
      }
    }
  }
  const straight = RAMP_PX;
  const diagonal = RAMP_PX * Math.SQRT2;
  const relax = (index: number, from: number, cost: number) => {
    const next = dist[from] + cost;
    if (next < dist[index]) {
      dist[index] = next;
    }
  };
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      if (col > 0) relax(index, index - 1, straight);
      if (row > 0) {
        relax(index, index - cols, straight);
        if (col > 0) relax(index, index - cols - 1, diagonal);
        if (col < cols - 1) relax(index, index - cols + 1, diagonal);
      }
    }
  }
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let col = cols - 1; col >= 0; col -= 1) {
      const index = row * cols + col;
      if (col < cols - 1) relax(index, index + 1, straight);
      if (row < rows - 1) {
        relax(index, index + cols, straight);
        if (col < cols - 1) relax(index, index + cols + 1, diagonal);
        if (col > 0) relax(index, index + cols - 1, diagonal);
      }
    }
  }
  const centerCol = Math.floor(cx / CELL);
  const stageAt = (px: number, py: number) => {
    const col = Math.floor((px - x0) / RAMP_PX);
    const row = Math.floor((py - y0) / RAMP_PX);
    if (col < 0 || row < 0 || col >= cols || row >= rows) {
      return RAMP_EMPTY;
    }
    const index = row * cols + col;
    if (shore[index]) {
      return 0;
    }
    if (land[index]) {
      const edge =
        (col > 0 && !land[index - 1]) || (col < cols - 1 && !land[index + 1]) || (row > 0 && !land[index - cols]) || (row < rows - 1 && !land[index + cols]);
      return edge ? 0 : RAMP_FREE;
    }
    const checker = (row + col) % 2 === 0;
    return rampStage(dist[index] + (checker ? RAMP_DITHER : -RAMP_DITHER));
  };
  const blocks: RampBlock[] = [];
  const dots: SurfaceGrain[] = [];
  const sparkles: ShallowRamp['sparkles'] = [];
  const per = RAMP_BLOCK / RAMP_PX;
  const counts = new Array<number>(RAMP_EMPTY + 1);
  const stages = new Int8Array(per * per);
  for (let by = Math.floor(y0 / RAMP_BLOCK) * RAMP_BLOCK; by < y1; by += RAMP_BLOCK) {
    for (let bx = Math.floor(x0 / RAMP_BLOCK) * RAMP_BLOCK; bx < x1; bx += RAMP_BLOCK) {
      counts.fill(0);
      let free = 0;
      for (let j = 0; j < per; j += 1) {
        for (let i = 0; i < per; i += 1) {
          const stage = stageAt(bx + i * RAMP_PX, by + j * RAMP_PX);
          stages[j * per + i] = stage;
          if (stage === RAMP_FREE) {
            free += 1;
          } else {
            counts[stage] += 1;
          }
        }
      }
      if (free === per * per || counts[RAMP_EMPTY] === per * per) {
        continue;
      }
      let base = RAMP_EMPTY;
      for (let stage = 0; stage <= RAMP_EMPTY; stage += 1) {
        if (counts[stage] > counts[base]) {
          base = stage;
        }
      }
      if (base !== RAMP_EMPTY) {
        blocks.push({ key: `block-${bx},${by}`, x: bx, y: by, stage: base, size: RAMP_BLOCK });
      }
      for (let j = 0; j < per; j += 1) {
        let runColor: string | null = null;
        let runStart = 0;
        for (let i = 0; i <= per; i += 1) {
          const stage = i < per ? stages[j * per + i] : RAMP_FREE;
          const color = stage === RAMP_FREE || stage === base ? null : rampColor(stage);
          if (color !== runColor) {
            if (runColor) {
              dots.push({
                key: `dot-${bx + runStart * RAMP_PX},${by + j * RAMP_PX}`,
                x: bx + runStart * RAMP_PX,
                y: by + j * RAMP_PX,
                size: (i - runStart) * RAMP_PX,
                height: RAMP_PX,
                color: runColor,
              });
            }
            runColor = color;
            runStart = i;
          }
        }
      }
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      const d = dist[index];
      if (land[index] || shore[index] || d >= RAMP_SPARKLE_REACH || d <= RAMP_PX || (col * 7 + row * 13) % RAMP_SPARKLE_EVERY !== 0) {
        continue;
      }
      const px = x0 + col * RAMP_PX;
      const py = y0 + row * RAMP_PX;
      const phase = ((col * 3 + row * 5) % RAMP_SPARKLE_PHASES) * (32 / RAMP_SPARKLE_PHASES);
      sparkles.push({ key: `spark-${row},${col}`, x: px, y: py, lag: waveLag(Math.floor(px / CELL), centerCol) + phase });
    }
  }
  return { blocks: mergeRampBlocks(blocks), dots, sparkles };
}

function mergeRampBlocks(blocks: RampBlock[]): RampBlock[] {
  if (RAMP_BLOCK >= CELL) {
    return blocks;
  }
  const byKey = new Map(blocks.map((block) => [`${block.x},${block.y}`, block]));
  const used = new Set<RampBlock>();
  const merged: RampBlock[] = [];
  for (const block of blocks) {
    if (used.has(block)) {
      continue;
    }
    const ox = Math.floor(block.x / CELL) * CELL;
    const oy = Math.floor(block.y / CELL) * CELL;
    const parts: RampBlock[] = [];
    for (let y = oy; y < oy + CELL; y += RAMP_BLOCK) {
      for (let x = ox; x < ox + CELL; x += RAMP_BLOCK) {
        const part = byKey.get(`${x},${y}`);
        if (part && part.stage === block.stage && !used.has(part)) {
          parts.push(part);
        }
      }
    }
    const full = (CELL / RAMP_BLOCK) ** 2;
    if (parts.length === full) {
      parts.forEach((part) => used.add(part));
      merged.push({ key: `block-${ox},${oy}`, x: ox, y: oy, stage: block.stage, size: CELL });
    } else {
      used.add(block);
      merged.push(block);
    }
  }
  return merged;
}

const CORNER_INSET = [
  [2, 2],
  [CELL - 2, 2],
  [2, CELL - 2],
  [CELL - 2, CELL - 2],
] as const;

/** 안쪽은 한 덩이로 두고, 바다와 맞닿는 모서리만 2px로 다시 나눈다. */
function addPatch(
  grains: SurfaceGrain[],
  key: string,
  x: number,
  y: number,
  size: number,
  color: string,
  holds: (px: number, py: number) => boolean,
) {
  const mid = size / 2;
  const rim =
    size > 2 &&
    (!holds(x - 1, y + mid) || !holds(x + size + 1, y + mid) || !holds(x + mid, y - 1) || !holds(x + mid, y + size + 1));
  if (!rim) {
    if (holds(x + mid, y + mid)) {
      grains.push({ key, x, y, size, color });
    }
    return;
  }
  for (let dy = 0; dy < size; dy += 2) {
    for (let dx = 0; dx < size; dx += 2) {
      if (!holds(x + dx + 1, y + dy + 1)) {
        continue;
      }
      grains.push({ key: `${key}.${dx}.${dy}`, x: x + dx, y: y + dy, size: 2, color });
    }
  }
}

function sandColor(look: IslandLook, x: number, y: number) {
  if (look === 1) {
    return SAND_COLORS[mix(x, y) % SAND_COLORS.length];
  }
  return mix(x, y) % 6 === 0 ? '#C9B27A' : '#F4E7C4';
}

function pushGrassBlades(grains: SurfaceGrain[], cellX: number, cellY: number) {
  const count = 12 + (mix(cellX, cellY) % 4);
  for (let index = 0; index < count; index += 1) {
    const width = 2;
    const height = mix(cellX, cellY, index) % 3 === 0 ? 8 : 4;
    grains.push({
      key: `blade-${cellX},${cellY},${index}`,
      x: cellX * CELL + (mix(cellX + 1, cellY, index) % (CELL - width)),
      y: cellY * CELL + (mix(cellX, cellY + 2, index) % (CELL - height)),
      size: width,
      height,
      color: mix(cellX, cellY, index) % 2 === 0 ? '#5E8A34' : '#A6C96A',
    });
  }
}

/** 잔디 타일 사이로 바다가 비치지 않게 1px 겹친다. */
const TILE_BLEED = 1;
const FILL = 2;

/** 땅 안쪽을 2px로 메운다. 칸 가운데만 보던 빈칸과, 확대할 때 갈라지는 경계를 같이 덮는다. */
function paintLandFill(
  grains: SurfaceGrain[],
  cells: IslandCell[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  zones: readonly IslandZoneId[],
) {
  const solid = new Set<string>();
  const rising = new Set<string>();
  for (const cell of cells) {
    if (cell.riseDelay != null) {
      rising.add(keyOf(cell.x, cell.y));
      continue;
    }
    if (cell.kind === 'grass' && !cell.fine) {
      solid.add(keyOf(cell.x, cell.y));
    }
  }
  const reach = 2.2;
  const x0 = Math.floor((cx - rx * reach) / FILL) * FILL;
  const x1 = Math.ceil((cx + rx * reach) / FILL) * FILL;
  const y0 = Math.floor((cy - ry * reach) / FILL) * FILL;
  const y1 = Math.ceil((cy + ry * reach) / FILL) * FILL;
  const grass = '#C5D78A';
  const sand = SAND_COLORS[0];
  for (let y = y0; y < y1; y += FILL) {
    let runX = Number.NaN;
    let runSand = false;
    const flush = (x: number) => {
      if (Number.isNaN(runX)) {
        return;
      }
      grains.push({
        key: `fill-${runX},${y}`,
        x: runX,
        y,
        size: x - runX + TILE_BLEED,
        height: FILL + TILE_BLEED,
        color: runSand ? sand : grass,
      });
      runX = Number.NaN;
    };
    for (let x = x0; x < x1; x += FILL) {
      const midX = x + 1;
      const midY = y + 1;
      const cellKey = keyOf(Math.floor(x / CELL), Math.floor(y / CELL));
      if (!onIsland(midX, midY, cx, cy, rx, ry, zones) || solid.has(cellKey) || rising.has(cellKey)) {
        flush(x);
        continue;
      }
      const beach = shoreSand(midX, midY, cx, cy, rx, ry, zones);
      if (Number.isNaN(runX)) {
        runX = x;
        runSand = beach;
        continue;
      }
      if (beach !== runSand) {
        flush(x);
        runX = x;
        runSand = beach;
      }
    }
    flush(x1);
  }
}

/** 잔디 전체를 짧은 풀잎으로 덮는다. 타일 경계와 단색 가장자리가 풀밭으로 이어지게 한다. */
function paintGrassTufts(
  grains: SurfaceGrain[],
  cells: IslandCell[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  zones: readonly IslandZoneId[],
) {
  const rising = new Set<string>();
  for (const cell of cells) {
    if (cell.riseDelay != null) {
      rising.add(keyOf(cell.x, cell.y));
    }
  }
  const reach = 2.2;
  const step = 4;
  const x0 = Math.floor((cx - rx * reach) / step) * step;
  const x1 = Math.ceil((cx + rx * reach) / step) * step;
  const y0 = Math.floor((cy - ry * reach) / step) * step;
  const y1 = Math.ceil((cy + ry * reach) / step) * step;
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      if (mix(x, y) % 5 === 0) {
        continue;
      }
      const bladeX = x + (mix(x, y, 1) % 3);
      const bladeY = y + (mix(x, y, 2) % 3);
      if (!onIsland(bladeX, bladeY, cx, cy, rx, ry, zones) || shoreSand(bladeX, bladeY, cx, cy, rx, ry, zones)) {
        continue;
      }
      if (rising.has(keyOf(Math.floor(bladeX / CELL), Math.floor(bladeY / CELL)))) {
        continue;
      }
      const colorIndex = mix(x, y, 4) % TUFT_COLORS.length;
      const color = TUFT_COLORS[colorIndex];
      const dark = colorIndex === 0 || colorIndex === 4;
      grains.push({ key: `tuft-${x},${y}`, x: bladeX, y: bladeY, size: 2, color });
      if (!dark) {
        continue;
      }
      const dots = 1 + (mix(x, y, 6) % 2);
      for (let dot = 1; dot <= dots; dot += 1) {
        const tipX = bladeX + ((mix(x, y, 7 + dot) % 5) - 2) * 2;
        const tipY = bladeY - 2 * dot;
        if (!onIsland(tipX, tipY, cx, cy, rx, ry, zones) || shoreSand(tipX, tipY, cx, cy, rx, ry, zones)) {
          continue;
        }
        grains.push({ key: `tuft-${x},${y}-${dot}`, x: tipX, y: tipY, size: 2, color });
      }
    }
  }
}

/** 속 잔디는 타일로 두고, 가장자리와 확장 땅은 2px로 메운 뒤 풀잎을 얹는다. */
function buildSurfaceGrains(
  cells: IslandCell[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  zones: readonly IslandZoneId[],
) {
  const grains: SurfaceGrain[] = [];
  paintLandFill(grains, cells, cx, cy, rx, ry, zones);
  paintGrassTufts(grains, cells, cx, cy, rx, ry, zones);
  return grains;
}

function smoothstep(amount: number) {
  const t = Math.min(1, Math.max(0, amount));
  return t * t * (3 - 2 * t);
}

/** 세로로 긴 사각형. 모서리만 조금 둥글다. */
function plaqueDist(x: number, y: number, hx: number, hy: number) {
  const corner = 20;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const qx = ax - Math.max(0, hx - corner);
  const qy = ay - Math.max(0, hy - corner);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - corner;
}

const WAVE = 2;

/** 남쪽 해안선 바로 아래에 2px 포말을 붙여, 기울기와 굽이를 따라가게 한다. */
function paintSouthFoam(
  grains: SurfaceGrain[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  landAt: (px: number, py: number) => boolean,
  southEnough: (px: number, py: number) => boolean,
) {
  const x0 = minX * CELL;
  const x1 = (maxX + 1) * CELL;
  const y0 = minY * CELL;
  const y1 = (maxY + 1) * CELL;
  for (let x = x0; x < x1; x += WAVE) {
    let edge = -1;
    for (let y = y0; y < y1; y += WAVE) {
      if (landAt(x + 1, y + 1)) {
        edge = y;
      }
    }
    if (edge < 0 || !southEnough(x + 1, edge + 1)) {
      continue;
    }
    const swell = Math.sin(x * 0.18);
    const broken = mix(x, 4) % 9 === 0;
    const lip = edge + WAVE;
    if (!broken) {
      grains.push({ key: `foam-${x}`, x, y: lip, size: WAVE, color: '#F7FFFC' });
      grains.push({
        key: `foam-b-${x}`,
        x,
        y: lip + (swell > 0.2 ? WAVE * 2 : WAVE),
        size: WAVE,
        color: swell > 0 ? '#F7FFFC' : '#DDF6F3',
      });
    }
    if (x % 4 !== 0) {
      continue;
    }
    const drop = 8 + (mix(x, 2) % 3) * 2;
    const washY = lip + drop;
    if (landAt(x + 2, washY + 2)) {
      continue;
    }
    grains.push({ key: `wash-${x}`, x, y: washY, size: 4, color: '#C8F1EE' });
    grains.push({
      key: `wash-b-${x}`,
      x,
      y: washY + 6,
      size: 4,
      color: mix(x, 5) % 2 === 0 ? '#8AD8DC' : '#5ECCC8',
    });
    if (mix(x, 6) % 3 !== 0 && !landAt(x + 2, washY + 16)) {
      grains.push({
        key: `bubble-${x}`,
        x,
        y: washY + 12 + (mix(x, 7) % 3) * 2,
        size: 4,
        height: 6,
        color: '#3CB8C4',
      });
    }
  }
}

function buildPlaque(width: number, height: number): { cells: IslandCell[]; grains: SurfaceGrain[] } {
  const { cx, cy, rx } = islandFrame(width, height);
  const hx = rx * 0.66;
  const hy = rx * 1.36;
  const sandBand = 22;
  const grains: SurfaceGrain[] = [];
  const grass = '#8FBF58';
  const minX = Math.floor((cx - hx - 8) / CELL);
  const maxX = Math.ceil((cx + hx + 8) / CELL);
  const minY = Math.floor((cy - hy - 8) / CELL);
  const maxY = Math.ceil((cy + hy + 8) / CELL);
  const inside = (px: number, py: number, inset: number) => plaqueDist(px - cx, py - cy, hx, hy) < -inset;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const x0 = x * CELL;
      const y0 = y * CELL;
      const covered = CORNER_INSET.every(([dx, dy]) => inside(x0 + dx, y0 + dy, sandBand));
      if (covered) {
        grains.push({ key: `field-${x},${y}`, x: x0, y: y0, size: CELL, color: grass });
        if (mix(x, y) % 3 === 0) {
          grains.push({
            key: `speck-${x},${y}`,
            x: x0 + (mix(x, y, 1) % (CELL - 2)),
            y: y0 + (mix(x, y, 2) % (CELL - 2)),
            size: 2,
            color: mix(x, y, 3) % 2 === 0 ? '#74A246' : '#D5E7A4',
          });
        }
        continue;
      }
      for (let row = 0; row < CELL / EDGE; row += 1) {
        for (let col = 0; col < CELL / EDGE; col += 1) {
          const px = x0 + col * EDGE;
          const py = y0 + row * EDGE;
          const dist = plaqueDist(px + EDGE / 2 - cx, py + EDGE / 2 - cy, hx, hy);
          if (dist >= 0) {
            continue;
          }
          const meadow = dist < -sandBand;
          const color = meadow
            ? mix(px, py) % 17 === 0
              ? '#74A246'
              : grass
            : dist > -3
              ? '#D2C094'
              : mix(px, py) % 9 === 0
                ? '#D8C79A'
                : '#E6D3A4';
          addPatch(grains, `plaque-${x},${y},${col},${row}`, px, py, EDGE, color, (sx, sy) =>
            meadow ? inside(sx, sy, sandBand) : plaqueDist(sx - cx, sy - cy, hx, hy) < 0,
          );
        }
      }
    }
  }
  paintSouthFoam(
    grains,
    minX,
    maxX,
    minY,
    maxY,
    (px, py) => inside(px, py, 0),
    (_px, py) => py > cy + hy * 0.62,
  );
  return { cells: [], grains };
}

const JEJU_TILT = (32 * Math.PI) / 180;
const JEJU_COS = Math.cos(JEJU_TILT);
const JEJU_SIN = Math.sin(JEJU_TILT);

function jejuAxes(px: number, py: number, cx: number, cy: number) {
  const dx = px - cx;
  const dy = py - cy;
  return {
    along: dx * JEJU_COS - dy * JEJU_SIN,
    across: dx * JEJU_SIN + dy * JEJU_COS,
  };
}

/** 오른쪽 끝이 높고 왼쪽 끝이 낮은 타원. 해안은 낮은 주파수로 들쑥날쑥하다. */
function jejuInside(px: number, py: number, cx: number, cy: number, hx: number, hy: number, inset: number) {
  const { along, across } = jejuAxes(px, py, cx, cy);
  const east = smoothstep((along / hx - 0.15) / 0.85);
  const west = smoothstep((-along / hx - 0.2) / 0.7);
  const taper = 1 - east * 0.3 + west * 0.06;
  const angle = Math.atan2(across, along);
  const bump =
    0.07 * Math.sin(angle * 2 + 0.7) +
    0.05 * Math.sin(angle * 3 - 0.8) +
    0.034 * Math.sin(angle * 5 + 0.4) +
    0.022 * Math.sin(angle * 8 - 1.1) +
    0.014 * Math.sin(angle * 13 + 0.6);
  const nx = along / hx;
  const ny = across / (hy * taper);
  const radial = Math.hypot(nx, ny);
  const scale = Math.hypot(Math.cos(angle) * hx, Math.sin(angle) * hy * taper);
  return radial <= 1 + bump - inset / Math.max(28, scale);
}

function buildJeju(width: number, height: number): { cells: IslandCell[]; grains: SurfaceGrain[] } {
  const { cx, cy, rx } = islandFrame(width, height);
  const hx = rx * 0.92;
  const hy = rx * 0.44;
  const sandBand = 18;
  const cells: IslandCell[] = [];
  const grains: SurfaceGrain[] = [];
  const inside = (px: number, py: number, inset: number) => jejuInside(px, py, cx, cy, hx, hy, inset);
  const minX = Math.floor((cx - hx - hy) / CELL) - 1;
  const maxX = Math.ceil((cx + hx + hy) / CELL) + 1;
  const minY = Math.floor((cy - hx * JEJU_SIN - hy) / CELL) - 1;
  const maxY = Math.ceil((cy + hx * JEJU_SIN + hy) / CELL) + 1;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const x0 = x * CELL;
      const y0 = y * CELL;
      const covered = CORNER_INSET.every(([dx, dy]) => inside(x0 + dx, y0 + dy, sandBand));
      if (covered) {
        cells.push({ key: keyOf(x, y), x, y, kind: 'grass' });
        pushGrassBlades(grains, x, y);
        continue;
      }
      for (let row = 0; row < CELL / EDGE; row += 1) {
        for (let col = 0; col < CELL / EDGE; col += 1) {
          const px = x0 + col * EDGE;
          const py = y0 + row * EDGE;
          const midX = px + EDGE / 2;
          const midY = py + EDGE / 2;
          if (!inside(midX, midY, 0)) {
            continue;
          }
          if (inside(midX, midY, sandBand)) {
            const speck = mix(px, py) % 7 === 0;
            const color = speck ? (mix(px, py, 1) % 2 === 0 ? '#5E8A34' : '#A6C96A') : '#C5D78A';
            addPatch(grains, `jeju-grass-${x},${y},${col},${row}`, px, py, EDGE, color, (sx, sy) => inside(sx, sy, sandBand));
            continue;
          }
          addPatch(grains, `jeju-sand-${x},${y},${col},${row}`, px, py, EDGE, sandColor(2, px, py), (sx, sy) => inside(sx, sy, 0));
        }
      }
    }
  }
  paintSouthFoam(
    grains,
    minX,
    maxX,
    minY,
    maxY,
    (px, py) => inside(px, py, 0),
    (px, py) => jejuAxes(px, py, cx, cy).across > hy * 0.22,
  );
  return { cells, grains };
}

function mix(x: number, y: number, n = 0) {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 3, 668265263) ^ Math.imul(n + 5, 1442695041);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return value >>> 0;
}

export function BeachHome({ look = 1 }: { look?: IslandLook }) {
  const cameraStyle = useIslandCameraStyle();
  const { unlockedZones, zoneUnlockReveal } = usePlayState();
  const { shaking, boiling, token, calm, openFog } = useVolcanoEruption();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [box, setBox] = useState({ width: windowWidth, height: windowHeight });
  const growingZoneId = zoneUnlockReveal?.zoneId ?? null;
  const island = useMemo(
    () => buildIslandCells(box.width, box.height, unlockedZones, growingZoneId, look),
    [box.height, box.width, growingZoneId, look, unlockedZones],
  );
  const cells = island.cells;
  const { landGrains, foamSegments } = useMemo(() => {
    const land: SurfaceGrain[] = [];
    const segments = new Map<number, SurfaceGrain[]>();
    for (const grain of island.grains) {
      if (!FOAM_KEY.test(grain.key)) {
        land.push(grain);
        continue;
      }
      const segment = Math.floor(grain.x / FOAM_SEGMENT_PX);
      const list = segments.get(segment);
      if (list) {
        list.push(grain);
      } else {
        segments.set(segment, [grain]);
      }
    }
    return { landGrains: land, foamSegments: [...segments.entries()] };
  }, [island.grains]);
  const coastBands = useMemo(() => {
    const bands = { shore: [] as IslandCell[], shallow: [] as IslandCell[], deep: [] as IslandCell[] };
    for (const cell of cells) {
      const sheet = animatedSheet(cell);
      if (sheet === SHORE_SHEET) {
        bands.shore.push(cell);
      } else if (sheet === SHALLOW_SHEET) {
        bands.shallow.push(cell);
      } else if (sheet === DEEP_SHEET) {
        bands.deep.push(cell);
      }
    }
    return bands;
  }, [cells]);
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
  const centerCol = Math.floor(islandFrame(box.width, box.height).cx / CELL);
  const revealOrigin = useMemo(() => {
    const { cx, cy } = landShape(box.width, box.height);
    return { cx, cy };
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
        <FlatLayer>
          <SeaFill centerCol={centerCol} />
        </FlatLayer>
      </View>
      <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, cameraStyle]}>
        <Quake active={shaking}>
          <FlatLayer>
            <SeaBand cells={coastBands.shore} sheet={SHORE_SHEET} centerCol={centerCol} />
            <SeaBand cells={coastBands.shallow} sheet={SHALLOW_SHEET} centerCol={centerCol} />
            <SeaBand cells={coastBands.deep} sheet={DEEP_SHEET} centerCol={centerCol} />
            {island.ramp ? <ShallowRampLayer ramp={island.ramp} before={island.before?.ramp} centerCol={centerCol} origin={revealOrigin} /> : null}
            {island.slices ? (
              <ShoreSlices
                slices={island.slices}
                before={island.before?.slices}
                centerCol={centerCol}
                origin={revealOrigin}
                shoreOnly={island.ramp != null}
              />
            ) : null}
          </FlatLayer>
        </Quake>
      </Reanimated.View>
      <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, cameraStyle]}>
        <Quake active={shaking}>
        {cells.map((cell) =>
          animatedSheet(cell) || ((cell.kind === 'sand' || cell.fine) && cell.riseDelay == null) ? null : cell.riseDelay == null ? (
            <Image
              key={cell.key}
              source={tileSource(cell)}
              pointerEvents="none"
              transition={0}
              style={{
                position: 'absolute',
                left: cell.x * CELL,
                top: cell.y * CELL,
                width: CELL + TILE_BLEED,
                height: CELL + TILE_BLEED,
                ...pixelImageStyle,
              }}
              contentFit="fill"
            />
          ) : (
            <RisingCell key={cell.key} cell={cell} />
          ),
        )}
        {landGrains.map((grain) => (
          <GrainDot key={grain.key} grain={grain} />
        ))}
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
      {foamSegments.length > 0 ? (
        <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, cameraStyle]}>
          <Quake active={shaking}>
            <FoamBand segments={foamSegments} centerCol={centerCol} />
          </Quake>
        </Reanimated.View>
      ) : null}
    </View>
  );
}

function GrainDot({ grain }: { grain: SurfaceGrain }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: grain.x,
        top: grain.y,
        width: grain.size,
        height: grain.height ?? grain.size,
        backgroundColor: grain.color,
      }}
    />
  );
}

function FoamBand({ segments, centerCol }: { segments: [number, SurfaceGrain[]][]; centerCol: number }) {
  useSeaClock();
  return (
    <>
      {segments.map(([segment, list]) => (
        <FoamSegment key={segment} frame={foamFrameForLag(waveLag(Math.floor((segment * FOAM_SEGMENT_PX) / CELL), centerCol))}>
          {list.map((grain) => (
            <GrainDot key={grain.key} grain={grain} />
          ))}
        </FoamSegment>
      ))}
    </>
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

function FlatLayer({ children }: { children: ReactNode }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (Platform.OS === 'web' && node?.style) {
      node.style.willChange = 'transform';
    }
  }, []);
  return (
    <View ref={ref} pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
      {children}
    </View>
  );
}

const RampSheetBlock = memo(function RampSheetBlock({ block, centerCol }: { block: RampBlock; centerCol: number }) {
  const sheet = RAMP_SHEETS[block.stage];
  const frame = seaFrameForLag(waveLag(Math.floor(block.x / CELL), centerCol));
  const left = -(((block.x % CELL) + CELL) % CELL);
  const top = -(((block.y % CELL) + CELL) % CELL);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: block.x, top: block.y, width: block.size, height: block.size, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ position: 'absolute', left, top }}>
        <SheetSprite source={sheet.body} cols={sheet.cols} rows={sheet.rows} size={CELL} frame={frame} />
      </View>
    </View>
  );
});

function RevealGroup({ delay, appear, children }: { delay: number; appear: boolean; children: ReactNode }) {
  const [value] = useState(() => new Animated.Value(appear ? 0 : 1));
  useEffect(() => {
    const anim = Animated.timing(value, {
      toValue: appear ? 1 : 0,
      duration: REVEAL_MS,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [appear, delay, value]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: value }}>
      {children}
    </Animated.View>
  );
}

function RevealList<T>({ reveal, render }: { reveal: Reveal<T>; render: (item: T) => ReactNode }) {
  return (
    <>
      {reveal.stay.map(render)}
      {reveal.gone.map(([delay, list]) => (
        <RevealGroup key={`gone-${delay}`} delay={delay} appear={false}>
          {list.map(render)}
        </RevealGroup>
      ))}
      {reveal.fresh.map(([delay, list]) => (
        <RevealGroup key={`fresh-${delay}`} delay={delay} appear>
          {list.map(render)}
        </RevealGroup>
      ))}
    </>
  );
}

const ShallowRampLayer = memo(function ShallowRampLayer({
  ramp,
  before,
  centerCol,
  origin,
}: {
  ramp: ShallowRamp;
  before?: ShallowRamp;
  centerCol: number;
  origin: RevealOrigin;
}) {
  useSeaClock();
  const groups = useMemo(() => {
    const byLag = new Map<number, ShallowRamp['sparkles']>();
    for (const sparkle of ramp.sparkles) {
      const lag = ((sparkle.lag % 32) + 32) % 32;
      const list = byLag.get(lag);
      if (list) {
        list.push(sparkle);
      } else {
        byLag.set(lag, [sparkle]);
      }
    }
    return [...byLag.entries()];
  }, [ramp.sparkles]);
  const blocks = useMemo(
    () =>
      splitReveal(
        ramp.blocks,
        before?.blocks,
        (block) => `${block.key}:${block.stage}:${block.size}`,
        (block) => revealDelay(block.x + block.size / 2, block.y + block.size / 2, origin),
      ),
    [before?.blocks, origin, ramp.blocks],
  );
  const dots = useMemo(
    () =>
      splitReveal(
        ramp.dots,
        before?.dots,
        (dot) => `${dot.key}:${dot.color}:${dot.size}`,
        (dot) => revealDelay(dot.x + dot.size / 2, dot.y, origin),
      ),
    [before?.dots, origin, ramp.dots],
  );
  return (
    <>
      <RevealList reveal={blocks} render={(block) => <RampSheetBlock key={block.key} block={block} centerCol={centerCol} />} />
      <FlatLayer>
        <RevealList reveal={dots} render={(dot) => <GrainDot key={dot.key} grain={dot} />} />
        {before
          ? null
          : groups.map(([lag, list]) => (
              <FoamSegment key={lag} frame={sparkleFrameForLag(lag)}>
                {list.map((sparkle) => (
                  <GrainDot key={sparkle.key} grain={{ key: sparkle.key, x: sparkle.x, y: sparkle.y, size: RAMP_PX, color: RAMP_SPARKLE_COLOR }} />
                ))}
              </FoamSegment>
            ))}
      </FlatLayer>
    </>
  );
});

function ShoreSlices({
  slices,
  before,
  centerCol,
  origin,
  shoreOnly,
}: {
  slices: ShoreSlice[];
  before?: ShoreSlice[];
  centerCol: number;
  origin: RevealOrigin;
  shoreOnly: boolean;
}) {
  useSeaClock();
  const reveal = useMemo(
    () =>
      splitReveal(
        slices,
        before,
        (slice) => `${slice.x}:${slice.top}:${slice.opacity}`,
        (slice) => revealDelay(slice.x + SLICE_PX / 2, slice.top, origin),
      ),
    [before, origin, slices],
  );
  return <RevealList reveal={reveal} render={(slice) => <ShoreSliceStrip key={slice.x} slice={slice} centerCol={centerCol} shoreOnly={shoreOnly} />} />;
}

const ShoreSliceStrip = memo(function ShoreSliceStrip({ slice, centerCol, shoreOnly }: { slice: ShoreSlice; centerCol: number; shoreOnly: boolean }) {
  const col = Math.floor(slice.x / CELL);
  const shift = -(slice.x - col * CELL);
  const frame = seaFrameForLag(waveLag(col, centerCol));
  const deepTop = slice.top + (SLICE_ROWS - 1) * CELL;
  const deepGrid = Math.floor(deepTop / CELL);
  const sheetRow = (sheet: MotionSheet, top: number, key: string) => (
    <View key={key} pointerEvents="none" style={{ position: 'absolute', left: shift, top }}>
      <SheetSprite source={sheet.body} cols={sheet.cols} rows={sheet.rows} size={CELL} frame={frame} />
    </View>
  );
  if (shoreOnly) {
    const height = shoreHeight(slice);
    const melt = slice.opacity < 1;
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: slice.x, top: slice.top, width: SLICE_PX, height, overflow: 'hidden' }}>
        {sheetRow(SHORE_SHEET, 0, 'shore')}
        {melt
          ? [height - RAMP_PX * 2, height - RAMP_PX].flatMap((y) =>
              Array.from({ length: SLICE_PX / RAMP_PX }, (_, i) => i).filter((i) => (i + (slice.x + y) / RAMP_PX) % 2 === 0).map((i) => (
                <View
                  key={`melt-${y}-${i}`}
                  pointerEvents="none"
                  style={{ position: 'absolute', left: i * RAMP_PX, top: y, width: RAMP_PX, height: RAMP_PX, backgroundColor: RAMP_COLORS[0] }}
                />
              )),
            )
          : null}
      </View>
    );
  }
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: slice.x,
        top: slice.top,
        width: SLICE_PX,
        height: SLICE_ROWS * CELL,
        overflow: 'hidden',
        opacity: slice.opacity,
      }}>
      {sheetRow(SHORE_SHEET, 0, 'shore')}
      {[1, 2].map((row) => {
        const tiles = coastTiles[row];
        return (
          <Image
            key={`coast-${row}`}
            source={tiles[((col % tiles.length) + tiles.length) % tiles.length]}
            transition={0}
            contentFit="fill"
            style={{ position: 'absolute', left: shift, top: row * CELL, width: CELL, height: CELL, ...pixelImageStyle }}
          />
        );
      })}
      {sheetRow(SHALLOW_SHEET, 3 * CELL, 'shallow')}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: (SLICE_ROWS - 1) * CELL, width: SLICE_PX, height: CELL, overflow: 'hidden' }}>
        {sheetRow(DEEP_SHEET, deepGrid * CELL - deepTop, 'deep-a')}
        {sheetRow(DEEP_SHEET, (deepGrid + 1) * CELL - deepTop, 'deep-b')}
      </View>
    </View>
  );
});

function SeaBand({ cells, sheet, centerCol }: { cells: IslandCell[]; sheet: MotionSheet; centerCol: number }) {
  useSeaClock();
  return (
    <>
      {cells.map((cell) => {
        const sprite = (
          <SheetSprite
            source={sheet.body}
            cols={sheet.cols}
            rows={sheet.rows}
            size={CELL}
            frame={seaFrameForLag(waveLag(cell.x, centerCol))}
          />
        );
        return cell.riseDelay == null ? (
          <View key={cell.key} pointerEvents="none" style={{ position: 'absolute', left: cell.x * CELL, top: cell.y * CELL }}>
            {sprite}
          </View>
        ) : (
          <RisingSheet key={cell.key} cell={cell}>
            {sprite}
          </RisingSheet>
        );
      })}
    </>
  );
}

function RisingSheet({ cell, children }: { cell: IslandCell; children: ReactNode }) {
  const rise = useRise(cell.riseDelay ?? null);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: cell.x * CELL, top: cell.y * CELL, width: CELL, height: CELL, ...rise }}>
      {children}
    </Animated.View>
  );
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
function SeaFill({ centerCol }: { centerCol: number }) {
  const { width, height: windowHeight } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const height = Math.max(windowHeight, measured);
  const cols = Math.max(1, Math.ceil(width / CELL));
  const rows = Math.max(1, Math.ceil(height / CELL));
  useSeaClock();

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => {
        const next = Math.ceil(event.nativeEvent.layout.height);
        setMeasured((current) => (current === next ? current : next));
      }}>
      <View style={{ position: 'absolute', top: 0, left: 0 }}>
        {Array.from({ length: rows }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row' }}>
            {Array.from({ length: cols }, (_, col) => (
              <SheetSprite
                key={col}
                source={DEEP_SHEET.body}
                cols={DEEP_SHEET.cols}
                rows={DEEP_SHEET.rows}
                size={CELL}
                frame={seaFrameForLag(waveLag(col, centerCol))}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
