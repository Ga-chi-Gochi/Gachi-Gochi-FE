import { largestRegion, regionAround, type WalkGrid } from '@/components/island/walk-route';
import { nearestWalkPoint } from '@/constants/island-terrain';
import type { IslandZoneId } from '@/constants/island-zones';

import { ON_LAND_RADIUS, planRoute, startRest, startTravel, type Engine, type Planner, type WalkPoint } from './creature';
import { MOTION_RULES } from './motion';
import { CELL, isWalkable, volcanoOrigin } from './shape';

export type WalkSetup = {
  points: WalkPoint[];
  plan?: Planner;
  allowed: Set<string>;
  footOffset: number;
  egg: boolean;
};

const LINE_STEP = 4;
const EGG_WALK_TARGETS: readonly [number, number][] = [
  [1, 4],
  [2, 4],
  [-1, 4],
  [4, 4],
];

const cellKey = (col: number, row: number) => `${col},${row}`;

function eggTargets(width: number, height: number, region: readonly { col: number; row: number }[], footOffset: number) {
  if (region.length === 0) {
    return [];
  }
  const origin = volcanoOrigin(width, height);
  const seen = new Set<string>();
  const points: WalkPoint[] = [];
  for (const [dc, dr] of EGG_WALK_TARGETS) {
    const want = { col: origin.x + dc, row: origin.y + dr };
    const cell = region.reduce((best, c) =>
      Math.hypot(c.col - want.col, c.row - want.row) < Math.hypot(best.col - want.col, best.row - want.row) ? c : best,
    );
    const key = cellKey(cell.col, cell.row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    points.push({ x: (cell.col + 0.5) * CELL, y: (cell.row + 0.5) * CELL - footOffset });
  }
  return points;
}

function walkRegion(width: number, height: number, zones: readonly IslandZoneId[], home?: WalkPoint) {
  const cells: { col: number; row: number }[] = [];
  for (let row = 0; row < Math.ceil(height / CELL); row += 1) {
    for (let col = 0; col < Math.ceil(width / CELL); col += 1) {
      if (isWalkable((col + 0.5) * CELL, (row + 0.5) * CELL, width, height, zones)) cells.push({ col, row });
    }
  }
  const homeRegion = home ? regionAround(cells, { col: Math.floor(home.x / CELL), row: Math.floor(home.y / CELL) }) : [];
  return homeRegion.length > 0 ? homeRegion : largestRegion(cells);
}

export function walkSetup(
  width: number,
  height: number,
  zones: readonly IslandZoneId[],
  egg: boolean,
  footOffset: number,
  raw: WalkPoint[],
): WalkSetup {
  if (width <= 0 || height <= 0) {
    return { points: raw, allowed: new Set(), footOffset, egg };
  }
  const home = raw[0] ? (egg ? { x: raw[0].x, y: raw[0].y + footOffset } : raw[0]) : undefined;
  const region = walkRegion(width, height, zones, home);
  const allowed = new Set(region.map((c) => cellKey(c.col, c.row)));
  if (egg) {
    const spots = eggTargets(width, height, region, footOffset);
    return { points: spots.length > 0 ? spots : raw, allowed, footOffset, egg };
  }
  const grid: WalkGrid = { cell: CELL, cells: region, canWalk: (x, y) => isWalkable(x, y, width, height, zones) };
  const plan: Planner = (from, to) => planRoute(grid, footOffset, from, to);
  if (region.length === 0) {
    return { points: raw, plan, allowed, footOffset, egg };
  }
  const cellPoints = region.map((c) => ({ x: (c.col + 0.5) * CELL, y: (c.row + 0.5) * CELL - footOffset }));
  const first = raw[0] ? nearestWalkPoint(cellPoints, raw[0]) : null;
  const points = first ? [first, ...cellPoints.filter((p) => p !== first)] : cellPoints;
  return { points, plan, allowed, footOffset, egg };
}

export function onAllowed(setup: WalkSetup, p: WalkPoint) {
  if (setup.allowed.size === 0) {
    return true;
  }
  return setup.allowed.has(cellKey(Math.floor(p.x / CELL), Math.floor((p.y + setup.footOffset) / CELL)));
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
  const nearest = nearestWalkPoint(setup.points, engine);
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
