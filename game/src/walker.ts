import { largestRegion, regionAround, type WalkGrid } from '@/components/island/walk-route';
import { nearestWalkPoint } from '@/constants/island-terrain';
import type { IslandZoneId } from '@/constants/island-zones';

import { ON_LAND_RADIUS, planRoute, startRest, startTravel, type Engine, type Planner, type WalkPoint } from './creature';
import { MOTION_RULES } from './motion';
import { CELL, VOLCANO_COLS, VOLCANO_ROWS, blockZoneFrame, isWalkable, volcanoOrigin } from './shape';

type Cell = { col: number; row: number };

export type WalkSetup = {
  points: WalkPoint[];
  plan?: Planner;
  allowed: Set<string>;
  cells: Cell[];
};

const LINE_STEP = 4;
const VOLCANO_SAMPLES = 20;

const cellKey = (col: number, row: number) => `${col},${row}`;
const cellCenter = (c: Cell): WalkPoint => ({ x: (c.col + 0.5) * CELL, y: (c.row + 0.5) * CELL });

function walkRegion(width: number, height: number, zones: readonly IslandZoneId[]) {
  const cells: Cell[] = [];
  for (let row = 0; row < Math.ceil(height / CELL); row += 1) {
    for (let col = 0; col < Math.ceil(width / CELL); col += 1) {
      if (isWalkable((col + 0.5) * CELL, (row + 0.5) * CELL, width, height, zones)) cells.push({ col, row });
    }
  }
  const core = blockZoneFrame('core', width, height);
  const homeRegion = core ? regionAround(cells, { col: Math.floor(core.left / CELL), row: Math.floor(core.top / CELL) }) : [];
  return homeRegion.length > 0 ? homeRegion : largestRegion(cells);
}

function nearestCell(cells: readonly Cell[], want: Cell) {
  return cells.reduce((best, c) =>
    Math.hypot(c.col - want.col, c.row - want.row) < Math.hypot(best.col - want.col, best.row - want.row) ? c : best,
  );
}

function walkTargets(width: number, height: number, region: readonly Cell[]) {
  if (region.length === 0) {
    return [];
  }
  const o = volcanoOrigin(width, height);
  const wanted: Cell[] = [
    { col: o.x - 2, row: o.y - 2 },
    { col: o.x + VOLCANO_COLS + 1, row: o.y - 2 },
    { col: o.x - 2, row: o.y + VOLCANO_ROWS + 1 },
    { col: o.x + VOLCANO_COLS + 1, row: o.y + VOLCANO_ROWS + 1 },
  ];
  const seen = new Set<string>();
  const points: WalkPoint[] = [];
  for (const want of wanted) {
    const cell = nearestCell(region, want);
    const key = cellKey(cell.col, cell.row);
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(cellCenter(cell));
  }
  return points;
}

function crossesVolcano(width: number, height: number, a: WalkPoint, b: WalkPoint) {
  const o = volcanoOrigin(width, height);
  const x0 = o.x * CELL;
  const y0 = o.y * CELL;
  const x1 = (o.x + VOLCANO_COLS) * CELL;
  const y1 = (o.y + VOLCANO_ROWS) * CELL;
  for (let i = 0; i <= VOLCANO_SAMPLES; i += 1) {
    const x = a.x + ((b.x - a.x) * i) / VOLCANO_SAMPLES;
    const y = a.y + ((b.y - a.y) * i) / VOLCANO_SAMPLES;
    if (x > x0 && x < x1 && y > y0 && y < y1) return true;
  }
  return false;
}

export function walkSetup(width: number, height: number, zones: readonly IslandZoneId[]): WalkSetup {
  if (width <= 0 || height <= 0) {
    return { points: [], allowed: new Set(), cells: [] };
  }
  const region = walkRegion(width, height, zones);
  const allowed = new Set(region.map((c) => cellKey(c.col, c.row)));
  const grid: WalkGrid = { cell: CELL, cells: region, canWalk: (x, y) => isWalkable(x, y, width, height, zones) };
  const setup: WalkSetup = { points: walkTargets(width, height, region), allowed, cells: region };
  setup.plan = (from, to) => {
    if (crossesVolcano(width, height, from, to)) return null;
    if (lineOnLand(setup, from, to)) return [to];
    return region.length > 0 ? planRoute(grid, 0, from, to) : null;
  };
  return setup;
}

export function onAllowed(setup: WalkSetup, p: WalkPoint) {
  if (setup.allowed.size === 0) {
    return true;
  }
  return setup.allowed.has(cellKey(Math.floor(p.x / CELL), Math.floor(p.y / CELL)));
}

function lineOnLand(setup: WalkSetup, from: WalkPoint, to: WalkPoint) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / LINE_STEP));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    if (!onAllowed(setup, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t })) {
      return false;
    }
  }
  return true;
}

function routeTo(setup: WalkSetup, from: WalkPoint, goal: WalkPoint) {
  if (setup.plan) {
    return setup.plan(from, goal);
  }
  return lineOnLand(setup, from, goal) ? [goal] : null;
}

export function snapToLand(engine: Engine, setup: WalkSetup) {
  const nearest = nearestWalkPoint(setup.cells.map(cellCenter), engine) ?? nearestWalkPoint(setup.points, engine);
  if (!nearest) {
    return;
  }
  engine.x = nearest.x;
  engine.y = nearest.y;
  startRest(engine, MOTION_RULES.restMs);
}

export function keepOnLand(engine: Engine, setup: WalkSetup) {
  if (!onAllowed(setup, engine)) {
    snapToLand(engine, setup);
  }
}

export function settleOnLand(engine: Engine, setup: WalkSetup) {
  if (!onAllowed(setup, engine)) {
    snapToLand(engine, setup);
    return;
  }
  if (engine.target) {
    const last = engine.route[engine.route.length - 1] ?? engine.target;
    const goal = onAllowed(setup, last) ? last : nearestWalkPoint(setup.points, last);
    const route = goal ? routeTo(setup, engine, goal) : null;
    if (!route || route.length === 0) {
      startRest(engine, MOTION_RULES.restMs);
      return;
    }
    engine.target = route[0];
    engine.route = route.slice(1);
    engine.facing = route[0].x >= engine.x ? 1 : -1;
    return;
  }
  const nearest = nearestWalkPoint(setup.points, engine);
  if (!nearest) {
    return;
  }
  const onLand = setup.points.some((p) => Math.hypot(p.x - engine.x, p.y - engine.y) < ON_LAND_RADIUS);
  if (onLand) {
    return;
  }
  const route = routeTo(setup, engine, nearest);
  if (route && route.length > 0) {
    startTravel(engine, route);
  } else {
    snapToLand(engine, setup);
  }
}

export function shiftEngine(engine: Engine, dx: number, dy: number) {
  if (dx === 0 && dy === 0) {
    return;
  }
  engine.x += dx;
  engine.y += dy;
  if (engine.target) {
    engine.target = { x: engine.target.x + dx, y: engine.target.y + dy };
  }
  engine.route = engine.route.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}
