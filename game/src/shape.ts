// 섬 땅·얕은 물·해안 모양 계산. components/island/beach-home.tsx 의 순수 함수들을 그대로 옮겼다 (그림 결과가 RN판과 같아야 한다).
// 좌표 단위는 RN 화면 dp 와 같다. 한 칸 CELL = 32.
import type { IslandZoneId } from '@/constants/island-zones';

import { MOTION_SEQ, type MotionSheet } from './motion';

export const CELL = 32;

export const REVEAL_MS = 380;

type LandKind = 'grass' | 'sand';
/** 남쪽은 꽉 찬 모래. 그 외 가장자리는 바깥이 비어 있는 타일로 둥글게 깎는다. */
type SandRim = 'fill' | 'n' | 'e' | 'w' | 'ne' | 'nw';

export type IslandCell = {
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

const keyOf = (x: number, y: number) => `${x},${y}`;

export function delayFor(x: number, y: number, cx: number, cy: number) {
  const dist = Math.hypot((x + 0.5) * CELL - cx, (y + 0.5) * CELL - cy);
  return 160 + Math.floor(dist / CELL) * 28;
}

/** 알이 서는 잔디. 휴화산 바로 남쪽이다. */
export const VOLCANO_COLS = 4;
export const VOLCANO_ROWS = 3;

/** 쉬는 분화구 안쪽. 아래 줄부터 한 줄씩 차오른다. */
export const CRATER_SPANS = [
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
export const CRATER_MID = 60;
/** 겉은 식은 껍질, 속은 주황, 열기는 노랗다. */
const MAGMA_COLOR = {
  crust: '#6E1C0C',
  deep: '#D64016',
  body: '#FF8C20',
  hot: '#FFE460',
} as const;

type MagmaKind = keyof typeof MAGMA_COLOR;
export type CraterPixel = { x: number; y: number; kind: MagmaKind; row: number; fromCenter: number };

export const CRATER_PIXELS: CraterPixel[] = CRATER_SPANS.flatMap((span, row) => {
  const pixels: CraterPixel[] = [];
  for (let x = span.x0; x <= span.x1; x += 2) {
    const edge = x === span.x0 || x === span.x1 || span.y >= 13;
    const hot = !edge && (x + span.y) % 8 === 0;
    const kind: MagmaKind = edge ? 'crust' : span.y >= 11 ? 'deep' : hot ? 'hot' : 'body';
    pixels.push({ x, y: span.y, kind, row, fromCenter: Math.abs(x - CRATER_MID) / 24 });
  }
  return pixels;
});

export const SEA_PLAIN_SPAN = CELL * 2;
export const SEA_PLAIN_COLOR = '#2ca6a4';
export const GRASS_CENTER_COLOR = '#3f9a5a';
export const SHORE_TUCK = 4;
export const SOFT_SHORE_SHEET: MotionSheet = { ...MOTION_SEQ['sea-shore'].sheet, body: 'tile-sea-shore-soft' };

type CellRect = { x0: number; y0: number; x1: number; y1: number };

const BLOCK_ZONES: Record<IslandZoneId, CellRect> = {
  core: { x0: -4, y0: 0, x1: 3, y1: 6 },
  north: { x0: -3, y0: -3, x1: 2, y1: -1 },
  south: { x0: -3, y0: 7, x1: 2, y1: 9 },
  west: { x0: -6, y0: 1, x1: -5, y1: 4 },
  east: { x0: 4, y0: 2, x1: 5, y1: 5 },
};
const BLOCK_CORE_MIN_TOP = 4;
const BLOCK_BEACH_FROM_CORE = 10;
const BLOCK_BEACH_ROWS = 2;
const BLOCK_ROWS_BELOW_BEACH = 4;
const BLOCK_BEACH_OVERHANG = 0.4;

export type BlockLayout = {
  center: number;
  coreTop: number;
  beachTop: number;
  beachBottom: number;
  shoreRow: number;
  minCol: number;
  maxCol: number;
  visibleCols: number;
};

export function blockLayout(width: number, height: number): BlockLayout {
  const rows = Math.floor(height / CELL);
  const coreTop = Math.max(BLOCK_CORE_MIN_TOP, rows - BLOCK_ROWS_BELOW_BEACH - BLOCK_BEACH_ROWS - BLOCK_BEACH_FROM_CORE);
  const beachTop = coreTop + BLOCK_BEACH_FROM_CORE;
  const fullCols = Math.ceil(width / CELL);
  const overhang = Math.ceil(fullCols * BLOCK_BEACH_OVERHANG);
  return {
    center: Math.round(width / 2 / CELL),
    coreTop,
    beachTop,
    beachBottom: beachTop + BLOCK_BEACH_ROWS - 1,
    shoreRow: beachTop + BLOCK_BEACH_ROWS,
    minCol: -overhang,
    maxCol: fullCols - 1 + overhang,
    visibleCols: Math.floor(width / CELL),
  };
}

function blockZoneRect(layout: BlockLayout, zoneId: IslandZoneId): CellRect {
  const rect = BLOCK_ZONES[zoneId];
  return {
    x0: layout.center + rect.x0,
    y0: layout.coreTop + rect.y0,
    x1: layout.center + rect.x1,
    y1: layout.coreTop + rect.y1,
  };
}

function isBeachRow(layout: BlockLayout, y: number) {
  return y >= layout.beachTop && y <= layout.beachBottom;
}

function blockLandSet(layout: BlockLayout, zones: readonly IslandZoneId[]) {
  const land = new Set<string>();
  for (const zoneId of new Set<IslandZoneId>(['core', ...zones])) {
    const rect = blockZoneRect(layout, zoneId);
    for (let y = rect.y0; y <= rect.y1; y += 1) {
      for (let x = rect.x0; x <= rect.x1; x += 1) {
        land.add(keyOf(x, y));
      }
    }
  }
  return land;
}

let blockLandCache: { key: string; land: Set<string> } | null = null;

function cachedBlockLand(width: number, height: number, layout: BlockLayout, zones: readonly IslandZoneId[]) {
  const key = `${width}x${height}:${[...zones].sort().join(',')}`;
  if (blockLandCache?.key !== key) {
    blockLandCache = { key, land: blockLandSet(layout, zones) };
  }
  return blockLandCache.land;
}

function blockLandAt(layout: BlockLayout, land: Set<string>, x: number, y: number) {
  return isBeachRow(layout, y) || land.has(keyOf(x, y));
}

export function blockZoneFrame(zoneId: IslandZoneId, width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return null;
  }
  const rect = blockZoneRect(blockLayout(width, height), zoneId);
  return {
    left: rect.x0 * CELL,
    top: rect.y0 * CELL,
    width: (rect.x1 - rect.x0 + 1) * CELL,
    height: (rect.y1 - rect.y0 + 1) * CELL,
  };
}

export function blockWalkPoints(zones: readonly IslandZoneId[], width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return null;
  }
  const layout = blockLayout(width, height);
  const points: { x: number; y: number }[] = [];
  for (const zoneId of new Set<IslandZoneId>(['core', ...zones])) {
    const rect = blockZoneRect(layout, zoneId);
    for (let y = rect.y0; y <= rect.y1; y += 1) {
      for (let x = rect.x0; x <= rect.x1; x += 1) {
        const px = (x + 0.5) * CELL;
        const py = (y + 0.5) * CELL;
        if (isWalkable(px, py, width, height, zones)) {
          points.push({ x: px, y: py });
        }
      }
    }
  }
  return points;
}

export type GrassPiece = string | 'flat';

export type BlockTile = {
  key: string;
  x: number;
  y: number;
  sand: string | null;
  grass: GrassPiece | null;
  riseDelay?: number;
};

function sandPiece(n: boolean, s: boolean, w: boolean, e: boolean): string {
  if (!n && !w && s && e) return 'tile-sand-corner-top-left';
  if (!n && !e && s && w) return 'tile-sand-corner-top-right';
  if (!s && !w && n && e) return 'tile-sand-corner-bottom-left';
  if (!s && !e && n && w) return 'tile-sand-corner-bottom-right';
  return 'sand-fill';
}

type Around = { n: boolean; s: boolean; w: boolean; e: boolean; nw: boolean; ne: boolean; sw: boolean; se: boolean };

function grassPiece({ n, s, w, e, nw, ne, sw, se }: Around): GrassPiece {
  if (!n && !w) return 'tile-grass-corner-top-left';
  if (!n && !e) return 'tile-grass-corner-top-right';
  if (!s && !w) return 'tile-grass-corner-bottom-left';
  if (!s && !e) return 'tile-grass-corner-bottom-right';
  if (!n) return 'tile-grass-side-top';
  if (!s) return 'tile-grass-side-bottom';
  if (!w) return 'tile-grass-side-left';
  if (!e) return 'tile-grass-side-right';
  if (!nw) return 'tile-grass-inner-top-left';
  if (!ne) return 'tile-grass-inner-top-right';
  if (!sw) return 'tile-grass-inner-bottom-left';
  if (!se) return 'tile-grass-inner-bottom-right';
  return 'flat';
}

export type BlockIsland = { tiles: BlockTile[]; shore: IslandCell[]; layout: BlockLayout };

export function buildBlockIsland(width: number, height: number, zones: readonly IslandZoneId[], growingZoneId: IslandZoneId | null): BlockIsland {
  const layout = blockLayout(width, height);
  const growing = growingZoneId && growingZoneId !== 'core' ? growingZoneId : null;
  const settledZones = zones.filter((zoneId) => zoneId !== growing);
  const fullZones = growing ? [...settledZones, growing] : settledZones;
  const settled = blockLandSet(layout, settledZones);
  const land = growing ? blockLandSet(layout, fullZones) : settled;
  const landAt = (x: number, y: number) => blockLandAt(layout, land, x, y);
  const grassAt = (x: number, y: number) => {
    if (isBeachRow(layout, y) || !land.has(keyOf(x, y))) {
      return false;
    }
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (!landAt(x + dx, y + dy)) {
          return false;
        }
      }
    }
    return true;
  };
  const origin = { cx: layout.center * CELL, cy: (layout.coreTop + 3.5) * CELL };
  const tiles: BlockTile[] = [];
  const place = (x: number, y: number) => {
    const n = landAt(x, y - 1);
    const s = landAt(x, y + 1);
    const w = landAt(x - 1, y);
    const e = landAt(x + 1, y);
    const grass = grassAt(x, y)
      ? grassPiece({
          n: grassAt(x, y - 1),
          s: grassAt(x, y + 1),
          w: grassAt(x - 1, y),
          e: grassAt(x + 1, y),
          nw: grassAt(x - 1, y - 1),
          ne: grassAt(x + 1, y - 1),
          sw: grassAt(x - 1, y + 1),
          se: grassAt(x + 1, y + 1),
        })
      : null;
    const fresh = growing != null && !isBeachRow(layout, y) && !settled.has(keyOf(x, y));
    tiles.push({
      key: keyOf(x, y),
      x,
      y,
      sand: grass === 'flat' ? null : sandPiece(n, s, w, e),
      grass,
      riseDelay: fresh ? delayFor(x, y, origin.cx, origin.cy) : undefined,
    });
  };
  for (const key of land) {
    const [x, y] = key.split(',').map(Number);
    if (!isBeachRow(layout, y)) {
      place(x, y);
    }
  }
  for (let y = layout.beachTop; y <= layout.beachBottom; y += 1) {
    for (let x = layout.minCol; x <= layout.maxCol; x += 1) {
      place(x, y);
    }
  }
  const shore: IslandCell[] = [];
  for (let x = layout.minCol; x <= layout.maxCol; x += 1) {
    shore.push({ key: `shore-${x}`, x, y: layout.shoreRow, kind: 'coast', coastRow: 0 });
  }
  return { tiles, shore, layout };
}

export function islandCenterCol(width: number, height: number) {
  return blockLayout(width, height).center;
}

export function volcanoOrigin(width: number, height: number) {
  const layout = blockLayout(width, height);
  return {
    x: layout.center - Math.floor(VOLCANO_COLS / 2),
    y: layout.coreTop + 2,
  };
}

export function volcanoMouthPoint(width: number, height: number) {
  const origin = volcanoOrigin(width, height);
  return { x: (origin.x + VOLCANO_COLS / 2) * CELL, y: (origin.y + VOLCANO_ROWS - 1) * CELL };
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
  const layout = blockLayout(width, height);
  if (x < 0 || y < 0 || x >= layout.visibleCols) {
    return false;
  }
  if (!blockLandAt(layout, cachedBlockLand(width, height, layout, zones), x, y)) {
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

/** 잔디 타일 사이로 바다가 비치지 않게 1px 겹친다. */
export const TILE_BLEED = 1;

export function mix(x: number, y: number, n = 0) {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 3, 668265263) ^ Math.imul(n + 5, 1442695041);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return value >>> 0;
}

export function spills(pixel: CraterPixel) {
  return pixel.y <= 4 || (pixel.kind === 'crust' && pixel.y <= 6);
}

export function magmaColor(pixel: CraterPixel, surface: boolean, elapsed: number) {
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

/** 세 번 꿀렁이며 차오른다. 각 구간은 빠르게 올랐다가 잠깐 잦아든다. */
export function surgeFill(amount: number) {
  const t = Math.min(1, Math.max(0, amount));
  const gulps = 3;
  const scaled = t * gulps;
  const index = Math.min(gulps - 1, Math.floor(scaled));
  const local = scaled - index;
  const eased = 1 - (1 - local) ** 2;
  return Math.min(1, (index + eased) / gulps);
}

