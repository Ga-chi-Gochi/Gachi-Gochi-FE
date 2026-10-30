import type { IslandZoneId } from '@/constants/island-zones';

/** 타일 그리드 — 구역 blob이 아니라 셀 합집합으로 한 덩어리 섬을 그림 */
export const ISLAND_GRID_W = 16;
export const ISLAND_GRID_H = 13;

export type TerrainEllipse = { cx: number; cy: number; rx: number; ry: number };

/** 각 구역이 기여하는 타원 (겹치면 한 땅으로 합쳐짐) */
export const ZONE_ELLIPSES: Record<IslandZoneId, TerrainEllipse> = {
  core: { cx: 8, cy: 7.2, rx: 3.6, ry: 2.85 },
  east: { cx: 11.4, cy: 7.3, rx: 2.55, ry: 2.25 },
  west: { cx: 4.6, cy: 7.1, rx: 2.5, ry: 2.2 },
  north: { cx: 8, cy: 4.3, rx: 2.7, ry: 2.35 },
  south: { cx: 8, cy: 10.1, rx: 2.9, ry: 2.2 },
};

/** 화산 위치 (그리드 좌표) */
export const VOLCANO_CELL = { x: 7.2, y: 4.8 };

function key(x: number, y: number) {
  return `${x},${y}`;
}

function addEllipse(set: Set<string>, ellipse: TerrainEllipse) {
  const { cx, cy, rx, ry } = ellipse;
  const minX = Math.max(0, Math.floor(cx - rx - 1));
  const maxX = Math.min(ISLAND_GRID_W - 1, Math.ceil(cx + rx + 1));
  const minY = Math.max(0, Math.floor(cy - ry - 1));
  const maxY = Math.min(ISLAND_GRID_H - 1, Math.ceil(cy + ry + 1));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        set.add(key(x, y));
      }
    }
  }
}

export function landCellSet(unlocked: IslandZoneId[]): Set<string> {
  const set = new Set<string>();
  for (const id of unlocked) {
    addEllipse(set, ZONE_ELLIPSES[id]);
  }
  return set;
}

export function parseCell(k: string): { x: number; y: number } {
  const [xs, ys] = k.split(',');
  return { x: Number(xs), y: Number(ys) };
}

export function cellsAddedByZone(unlockedBefore: IslandZoneId[], zoneId: IslandZoneId): string[] {
  const before = landCellSet(unlockedBefore);
  const after = landCellSet([...unlockedBefore, zoneId]);
  return Array.from(after).filter((c) => !before.has(c));
}

export function isLand(set: Set<string>, x: number, y: number) {
  return set.has(key(x, y));
}

/** 배치 탭용 — 구역 타원의 픽셀 바운딩 박스 */
export function zoneHitRect(
  zoneId: IslandZoneId,
  mapW: number,
  mapH: number,
): { left: number; top: number; width: number; height: number } {
  const e = ZONE_ELLIPSES[zoneId];
  const cellW = mapW / ISLAND_GRID_W;
  const cellH = mapH / ISLAND_GRID_H;
  return {
    left: (e.cx - e.rx) * cellW,
    top: (e.cy - e.ry) * cellH,
    width: e.rx * 2 * cellW,
    height: e.ry * 2 * cellH,
  };
}

/** 바운딩 박스(물에 빠질 수 있음) — 레거시/폴백용 */
export function walkBoundsFromLand(
  unlocked: IslandZoneId[],
  mapW: number,
  mapH: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const points = walkPointsFromLand(unlocked, mapW, mapH);
  if (points.length === 0) {
    return { minX: mapW * 0.4, maxX: mapW * 0.6, minY: mapH * 0.45, maxY: mapH * 0.6 };
  }
  return {
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

/**
 * 열린 섬 타일 중심점들. 캐릭터는 이 점들만 골라 이동 → 섬 밖(물)로 안 나감.
 * 섬이 넓어지면 unlocked에 맞춰 점이 늘어남.
 */
export function walkPointsFromLand(
  unlocked: IslandZoneId[],
  mapW: number,
  mapH: number,
): { x: number; y: number }[] {
  const set = landCellSet(unlocked);
  const cellW = mapW / ISLAND_GRID_W;
  const cellH = mapH / ISLAND_GRID_H;
  const points: { x: number; y: number }[] = [];

  for (const c of set) {
    const { x, y } = parseCell(c);
    // 가장자리(물과 맞닿은) 셀은 살짝 안쪽으로만 — 해안선에 걸리지 않게
    const edge =
      !isLand(set, x, y - 1) ||
      !isLand(set, x, y + 1) ||
      !isLand(set, x - 1, y) ||
      !isLand(set, x + 1, y);
    // 완전 외곽만 스킵하지 않고, 내륙 셀을 우선 포함. 외곽은 중심에서 안쪽으로 당김.
    let cx = (x + 0.5) * cellW;
    let cy = (y + 0.5) * cellH;
    if (edge) {
      const core = ZONE_ELLIPSES.core;
      const corePxX = core.cx * cellW;
      const corePxY = core.cy * cellH;
      cx = cx * 0.72 + corePxX * 0.28;
      cy = cy * 0.72 + corePxY * 0.28;
      // 당긴 좌표가 여전히 땅인지 대략 확인 — 아니면 셀 중심 유지
      const gx = Math.floor(cx / cellW);
      const gy = Math.floor(cy / cellH);
      if (!isLand(set, gx, gy)) {
        cx = (x + 0.5) * cellW;
        cy = (y + 0.5) * cellH;
      }
    }
    points.push({ x: cx, y: cy });
  }

  return points;
}

export function nearestWalkPoint(
  points: { x: number; y: number }[],
  from: { x: number; y: number },
): { x: number; y: number } | null {
  if (points.length === 0) {
    return null;
  }
  let best = points[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const p of points) {
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
