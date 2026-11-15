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

/** 개발 중 비교용. 1은 둥근 섬, 2는 기울어진 제주도, 3은 세로로 긴 섬이다. */
export type IslandLook = 1 | 2 | 3;

/** 모서리 계단. 바다와 맞닿는 자리는 이 절반으로 한 번 더 나눈다. */
const EDGE = 4;
const SAND_COLORS = ['#E6D4A6', '#F2E2B6', '#D8C48E', '#CDB888'] as const;
const TUFT_COLORS = ['#6E9448', '#8FB85C', '#B7D488', '#D3E7A4', '#5C8438'] as const;
const TUFT_SIZES = [2, 2, 4, 4, 6, 8] as const;


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
): { cells: IslandCell[]; grains: SurfaceGrain[] } {
  if (width === 0 || height === 0) {
    return { cells: [], grains: [] };
  }
  if (look === 3) {
    return buildPlaque(width, height);
  }
  if (look === 2) {
    return buildJeju(width, height);
  }
  const { cx, cy, rx: radius } = islandFrame(width, height);
  const rx = radius;
  const ry = radius * 0.7;
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
      const fine = meadow && !CORNER_INSET.every(([dx, dy]) => grassy(x0 + dx, y0 + dy));
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

  const grains = buildSurfaceGrains(cells, [], cx, cy, rx, ry, fullZones, isLand, look);
  paintSouthFoam(
    grains,
    minX,
    maxX,
    minY,
    maxY,
    (px, py) => {
      if (!insideZones((px - cx) / rx, (py - cy) / ry, fullZones)) {
        return false;
      }
      if (growing != null && !settled.has(keyOf(Math.floor(px / CELL), Math.floor(py / CELL)))) {
        return false;
      }
      return true;
    },
    (px, py) => (py - cy) / ry > SOUTH_SHORE,
  );
  return { cells, grains };
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

/** 모래는 4px로 깔고, 모서리는 2px로 깎는다. 잔디 점도 칸마다 섞는다. */
function buildSurfaceGrains(
  cells: IslandCell[],
  shores: { x: number; southY: number }[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  zones: readonly IslandZoneId[],
  isLand: (x: number, y: number) => boolean,
  look: IslandLook,
) {
  const grains: SurfaceGrain[] = [];
  const coastTop = new Map(shores.map((shore) => [shore.x, (shore.southY + 1) * CELL]));
  const onLand = (px: number, py: number) => {
    const nx = (px - cx) / rx;
    const ny = (py - cy) / ry;
    return insideZones(nx, ny, zones);
  };
  const aboveCoast = (px: number, py: number) => {
    const coast = coastTop.get(Math.floor(px / CELL));
    return coast == null || py < coast;
  };
  for (const cell of cells) {
    if (cell.kind === 'coast' || cell.riseDelay != null) {
      continue;
    }
    if (cell.kind === 'sand' || cell.fine) {
      for (let row = 0; row < CELL / EDGE; row += 1) {
        for (let col = 0; col < CELL / EDGE; col += 1) {
          const x = cell.x * CELL + col * EDGE;
          const y = cell.y * CELL + row * EDGE;
          const midX = x + EDGE / 2;
          const midY = y + EDGE / 2;
          if (!onLand(midX, midY) || !aboveCoast(midX, midY)) {
            continue;
          }
          const beach = shoreSand(midX, midY, cx, cy, rx, ry, zones);
          if (beach) {
            addPatch(grains, `rim-${cell.x},${cell.y},${col},${row}`, x, y, EDGE, sandColor(look, x, y), (px, py) =>
              shoreSand(px, py, cx, cy, rx, ry, zones),
            );
            continue;
          }
          const speck = mix(x, y) % 5 === 0;
          const color = speck ? TUFT_COLORS[mix(x, y, 2) % TUFT_COLORS.length] : '#C5D78A';
          addPatch(grains, `meadow-${cell.x},${cell.y},${col},${row}`, x, y, EDGE, color, (px, py) => onLand(px, py) && !shoreSand(px, py, cx, cy, rx, ry, zones));
        }
      }
      continue;
    }
    if (look === 1) {
      const count = 8 + (mix(cell.x, cell.y) % 5);
      for (let index = 0; index < count; index += 1) {
        const size = TUFT_SIZES[mix(cell.x, cell.y, index) % TUFT_SIZES.length];
        grains.push({
          key: `tuft-${cell.x},${cell.y},${index}`,
          x: cell.x * CELL + (mix(cell.x + 3, cell.y, index) % (CELL - size)),
          y: cell.y * CELL + (mix(cell.x, cell.y + 5, index) % (CELL - size)),
          size,
          color: TUFT_COLORS[mix(cell.x, cell.y, index + 9) % TUFT_COLORS.length],
        });
      }
      continue;
    }
    pushGrassBlades(grains, cell.x, cell.y);
  }
  const minX = Math.floor((cx - rx * 1.35) / EDGE);
  const maxX = Math.ceil((cx + rx * 1.35) / EDGE);
  const minY = Math.floor((cy - ry * 1.35) / EDGE);
  const maxY = Math.ceil((cy + ry * 1.35) / EDGE);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const px = x * EDGE;
      const py = y * EDGE;
      const nx = (px + EDGE / 2 - cx) / rx;
      const ny = (py + EDGE / 2 - cy) / ry;
      if (!insideZones(nx, ny, zones)) {
        continue;
      }
      if (isLand(Math.floor(px / CELL), Math.floor(py / CELL))) {
        continue;
      }
      if (!aboveCoast(px, py)) {
        continue;
      }
      const beach = shoreSand(px + EDGE / 2, py + EDGE / 2, cx, cy, rx, ry, zones);
      const color = beach ? sandColor(look, px, py) : mix(px, py) % 5 === 0 ? TUFT_COLORS[mix(px, py, 2) % TUFT_COLORS.length] : '#C5D78A';
      addPatch(grains, `step-${x},${y}`, px, py, EDGE, color, (sx, sy) => {
        const sand = shoreSand(sx, sy, cx, cy, rx, ry, zones);
        return beach ? sand : onLand(sx, sy) && !sand;
      });
    }
  }
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
  const grains = island.grains;
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
          (cell.kind === 'sand' || cell.fine) && cell.riseDelay == null ? null : cell.riseDelay == null ? (
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
        {grains.map((grain) => (
          <View
            key={grain.key}
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
