// 섬 땅·얕은 물·해안 모양 계산. components/island/beach-home.tsx 의 순수 함수들을 그대로 옮겼다 (그림 결과가 RN판과 같아야 한다).
// 좌표 단위는 RN 화면 dp 와 같다. 한 칸 CELL = 32.
import { ISLAND_STAGE_ART, isLandCell, type IslandStageArt, type IslandStageId } from '@/constants/island-stages';
import { ISLAND_FOREST_ART, ISLAND_ZONE_SHARE, type IslandZoneId } from '@/constants/island-zones';

import { MOTION_SEQ, type MotionSheet } from './motion';

export const CELL = 32;

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

export const SEA_PLAIN_COLOR = '#32b5b3';
export const SHORE_FOAM = false;
export const SHORE_TUCK = 4;
export const SOFT_SHORE_SHEET: MotionSheet = { ...MOTION_SEQ['sea-shore'].sheet, body: 'tile-sea-shore-soft' };

export const VOLCANO_ART_W = VOLCANO_COLS * CELL;
export const VOLCANO_ART_H = VOLCANO_ROWS * CELL;

export type CellPos = { col: number; row: number };
export type WorldBox = { left: number; top: number; width: number; height: number };

export function stageArt(stage: IslandStageId): IslandStageArt {
  return ISLAND_STAGE_ART[stage];
}

export function volcanoScale(stage: IslandStageId) {
  const [x0, , x1] = stageArt(stage).volcanoBox;
  return (x1 - x0) / VOLCANO_ART_W;
}

export function volcanoFrame(stage: IslandStageId) {
  const [ax, ay] = stageArt(stage).volcanoAnchor;
  const scale = volcanoScale(stage);
  return { x: ax - (VOLCANO_ART_W * scale) / 2, y: ay - VOLCANO_ART_H * scale, scale };
}

export const VOLCANO_SLOT_W = 3 * CELL;
export const VOLCANO_SLOT_H = 2 * CELL;

export function volcanoSlot(stage: IslandStageId) {
  const [ax, ay] = stageArt(stage).volcanoAnchor;
  return { x: ax - VOLCANO_SLOT_W / 2, y: ay - VOLCANO_SLOT_H };
}

export function craterCloudPoint(stage: IslandStageId) {
  const f = volcanoFrame(stage);
  return { x: stageArt(stage).volcanoAnchor[0], y: f.y + 6 * f.scale };
}

export function volcanoCells(stage: IslandStageId) {
  const f = volcanoFrame(stage);
  return {
    col0: Math.floor(f.x / CELL),
    row0: Math.floor(f.y / CELL),
    col1: Math.ceil((f.x + VOLCANO_ART_W * f.scale) / CELL) - 1,
    row1: Math.ceil((f.y + VOLCANO_ART_H * f.scale) / CELL) - 1,
  };
}

/**
 * stage3 북서 풀숲 — constants/island-zones ISLAND_FOREST_ART 와 동일.
 * 탐험 애니 판의 forestX/Y(34,30) 와 맞추려면 판 원점 = (x − 34, y − 30).
 */
export const FOREST_FRAME = ISLAND_FOREST_ART;

/** @deprecated 조각 타일 배치 — 지금은 FOREST_FRAME 한 장 사용 */
export const STAGE3_FOREST = [
  { key: 'forest', x: FOREST_FRAME.x, y: FOREST_FRAME.y, w: FOREST_FRAME.w, h: FOREST_FRAME.h },
] as const;

export function forestCells(stage: IslandStageId) {
  if (stage !== 3) return null;
  const f = FOREST_FRAME;
  return {
    col0: Math.floor(f.x / CELL),
    row0: Math.floor(f.y / CELL),
    col1: Math.ceil((f.x + f.w) / CELL) - 1,
    row1: Math.ceil((f.y + f.h) / CELL) - 1,
  };
}

export function nearVolcano(stage: IslandStageId, col: number, row: number) {
  const v = volcanoCells(stage);
  return col >= v.col0 - 1 && col <= v.col1 + 1 && row >= v.row0 - 1 && row <= v.row1 + 1;
}

export function nearForest(stage: IslandStageId, col: number, row: number) {
  const f = forestCells(stage);
  if (!f) return false;
  return col >= f.col0 && col <= f.col1 && row >= f.row0 && row <= f.row1;
}

export function isWalkableCell(stage: IslandStageId, col: number, row: number) {
  return isLandCell(stageArt(stage), col, row) && !nearVolcano(stage, col, row) && !nearForest(stage, col, row);
}

export function isWalkable(stage: IslandStageId, px: number, py: number) {
  return isWalkableCell(stage, Math.floor(px / CELL), Math.floor(py / CELL));
}

export function walkableCells(stage: IslandStageId) {
  const art = stageArt(stage);
  const cells: CellPos[] = [];
  for (let row = 0; row < art.rows; row += 1) {
    for (let col = 0; col < art.cols; col += 1) {
      if (isWalkableCell(stage, col, row)) cells.push({ col, row });
    }
  }
  return cells;
}

export function walkTargetCells(stage: IslandStageId): CellPos[] {
  const v = volcanoCells(stage);
  return [
    { col: v.col0 - 1, row: v.row0 - 1 },
    { col: v.col1 + 1, row: v.row0 - 1 },
    { col: v.col0 - 1, row: v.row1 + 4 },
    { col: v.col1 + 1, row: v.row1 + 4 },
  ];
}

export function shoreCells(stage: IslandStageId): CellPos[] {
  const art = stageArt(stage);
  const cells: CellPos[] = [];
  for (let col = 0; col < art.cols; col += 1) {
    for (let row = art.rows; row >= 1; row -= 1) {
      if (isLandCell(art, col, row - 1) && !isLandCell(art, col, row)) {
        cells.push({ col, row });
        break;
      }
    }
  }
  return cells;
}

export function zoneFrame(stage: IslandStageId, zoneId: IslandZoneId): WorldBox {
  const art = stageArt(stage);
  const s = ISLAND_ZONE_SHARE[zoneId];
  return { left: s.x * art.width, top: s.y * art.height, width: s.w * art.width, height: s.h * art.height };
}

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

