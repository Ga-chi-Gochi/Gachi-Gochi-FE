import { largestRegion, type WalkGrid } from '@/components/island/walk-route';
import type { IslandStageId } from '@/constants/island-stages';
import { nearestWalkPoint } from '@/constants/island-terrain';

import { ON_LAND_RADIUS, planRoute, startRest, startTravel, type Engine, type Planner, type WalkPoint } from './creature';
import { MOTION_RULES } from './motion';
import { CELL, isWalkable, volcanoCells, walkTargetCells, walkableCells } from './shape';

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

function walkRegion(stage: IslandStageId) {
  return largestRegion(walkableCells(stage));
}

function nearestCell(cells: readonly Cell[], want: Cell) {
  return cells.reduce((best, c) =>
    Math.hypot(c.col - want.col, c.row - want.row) < Math.hypot(best.col - want.col, best.row - want.row) ? c : best,
  );
}

function walkTargets(stage: IslandStageId, region: readonly Cell[]) {
  if (region.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const points: WalkPoint[] = [];
  for (const want of walkTargetCells(stage)) {
    const free = region.filter((c) => !seen.has(cellKey(c.col, c.row)));
    if (free.length === 0) break;
    const cell = nearestCell(free, want);
    seen.add(cellKey(cell.col, cell.row));
    points.push(cellCenter(cell));
  }
  return points;
}

export function crossesVolcano(stage: IslandStageId, a: WalkPoint, b: WalkPoint) {
  const v = volcanoCells(stage);
  const x0 = v.col0 * CELL;
  const y0 = v.row0 * CELL;
  const x1 = (v.col1 + 1) * CELL;
  const y1 = (v.row1 + 1) * CELL;
  for (let i = 0; i <= VOLCANO_SAMPLES; i += 1) {
    const x = a.x + ((b.x - a.x) * i) / VOLCANO_SAMPLES;
    const y = a.y + ((b.y - a.y) * i) / VOLCANO_SAMPLES;
    if (x > x0 && x < x1 && y > y0 && y < y1) return true;
  }
  return false;
}

export function walkSetup(stage: IslandStageId): WalkSetup {
  const region = walkRegion(stage);
  const allowed = new Set(region.map((c) => cellKey(c.col, c.row)));
  const grid: WalkGrid = { cell: CELL, cells: region, canWalk: (x, y) => isWalkable(stage, x, y) };
  const setup: WalkSetup = { points: walkTargets(stage, region), allowed, cells: region };
  setup.plan = (from, to) => {
    if (crossesVolcano(stage, from, to)) return null;
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
