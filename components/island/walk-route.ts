type Point = { x: number; y: number };
type GridCell = { col: number; row: number };

export type WalkGrid = {
  cell: number;
  cells: readonly GridCell[];
  canWalk: (x: number, y: number) => boolean;
};

const CORNER_EPSILON = 1e-9;
const NEIGHBORS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const openCache = new WeakMap<WalkGrid, Set<string>>();

function keyOf(col: number, row: number) {
  return `${col},${row}`;
}

function openSet(grid: WalkGrid) {
  let open = openCache.get(grid);
  if (!open) {
    open = new Set(grid.cells.map((cell) => keyOf(cell.col, cell.row)));
    openCache.set(grid, open);
  }
  return open;
}

function center(grid: WalkGrid, cell: GridCell): Point {
  return { x: (cell.col + 0.5) * grid.cell, y: (cell.row + 0.5) * grid.cell };
}

function segmentClear(grid: WalkGrid, from: Point, to: Point) {
  const open = openSet(grid);
  const size = grid.cell;
  let col = Math.floor(from.x / size);
  let row = Math.floor(from.y / size);
  const endCol = Math.floor(to.x / size);
  const endRow = Math.floor(to.y / size);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const deltaX = dx !== 0 ? size / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const deltaY = dy !== 0 ? size / Math.abs(dy) : Number.POSITIVE_INFINITY;
  let maxX = dx > 0 ? ((col + 1) * size - from.x) / dx : dx < 0 ? (from.x - col * size) / -dx : Number.POSITIVE_INFINITY;
  let maxY = dy > 0 ? ((row + 1) * size - from.y) / dy : dy < 0 ? (from.y - row * size) / -dy : Number.POSITIVE_INFINITY;
  const isOpen = (c: number, r: number) => open.has(keyOf(c, r));
  if (!isOpen(col, row)) {
    return false;
  }
  const limit = Math.abs(endCol - col) + Math.abs(endRow - row) + 2;
  for (let guard = 0; (col !== endCol || row !== endRow) && guard < limit; guard += 1) {
    if (Math.abs(maxX - maxY) < CORNER_EPSILON) {
      if (!isOpen(col + stepX, row) || !isOpen(col, row + stepY)) {
        return false;
      }
      col += stepX;
      row += stepY;
      maxX += deltaX;
      maxY += deltaY;
    } else if (maxX < maxY) {
      col += stepX;
      maxX += deltaX;
    } else {
      row += stepY;
      maxY += deltaY;
    }
    if (!isOpen(col, row)) {
      return false;
    }
  }
  return true;
}

function nearestOpen(grid: WalkGrid, foot: Point): GridCell | null {
  let best: GridCell | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const cell of grid.cells) {
    const point = center(grid, cell);
    const dist = Math.hypot(point.x - foot.x, point.y - foot.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = cell;
    }
  }
  return best;
}

function searchCells(grid: WalkGrid, start: GridCell, goal: GridCell): GridCell[] | null {
  const open = openSet(grid);
  const startKey = keyOf(start.col, start.row);
  const goalKey = keyOf(goal.col, goal.row);
  const prev = new Map<string, string | null>([[startKey, null]]);
  const cells = new Map<string, GridCell>([[startKey, start]]);
  const queue: GridCell[] = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    const currentKey = keyOf(current.col, current.row);
    if (currentKey === goalKey) {
      const path: GridCell[] = [];
      for (let key: string | null = goalKey; key != null; key = prev.get(key) ?? null) {
        path.unshift(cells.get(key) as GridCell);
      }
      return path;
    }
    for (const [dc, dr] of NEIGHBORS) {
      const col = current.col + dc;
      const row = current.row + dr;
      const key = keyOf(col, row);
      if (prev.has(key) || !linked(open, current.col, current.row, dc, dr)) {
        continue;
      }
      prev.set(key, currentKey);
      const next = { col, row };
      cells.set(key, next);
      queue.push(next);
    }
  }
  return null;
}

function linked(open: Set<string>, col: number, row: number, dc: number, dr: number) {
  if (!open.has(keyOf(col + dc, row + dr))) {
    return false;
  }
  return dc === 0 || dr === 0 || (open.has(keyOf(col + dc, row)) && open.has(keyOf(col, row + dr)));
}

export function regionAround(cells: readonly GridCell[], start: GridCell): GridCell[] {
  const open = new Set(cells.map((cell) => keyOf(cell.col, cell.row)));
  if (!open.has(keyOf(start.col, start.row))) {
    return [];
  }
  const seen = new Set<string>([keyOf(start.col, start.row)]);
  const region: GridCell[] = [];
  const queue: GridCell[] = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    region.push(current);
    for (const [dc, dr] of NEIGHBORS) {
      const key = keyOf(current.col + dc, current.row + dr);
      if (seen.has(key) || !linked(open, current.col, current.row, dc, dr)) {
        continue;
      }
      seen.add(key);
      queue.push({ col: current.col + dc, row: current.row + dr });
    }
  }
  return region;
}

export function largestRegion(cells: readonly GridCell[]): GridCell[] {
  const open = new Set(cells.map((cell) => keyOf(cell.col, cell.row)));
  const seen = new Set<string>();
  let best: GridCell[] = [];
  for (const cell of cells) {
    if (seen.has(keyOf(cell.col, cell.row))) {
      continue;
    }
    const region: GridCell[] = [];
    const queue: GridCell[] = [cell];
    seen.add(keyOf(cell.col, cell.row));
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      region.push(current);
      for (const [dc, dr] of NEIGHBORS) {
        const key = keyOf(current.col + dc, current.row + dr);
        if (seen.has(key) || !linked(open, current.col, current.row, dc, dr)) {
          continue;
        }
        seen.add(key);
        queue.push({ col: current.col + dc, row: current.row + dr });
      }
    }
    if (region.length > best.length) {
      best = region;
    }
  }
  return best;
}

export function planRoute(grid: WalkGrid, footOffset: number, from: Point, to: Point): Point[] | null {
  const open = openSet(grid);
  const fromFoot = { x: from.x, y: from.y + footOffset };
  const toFoot = { x: to.x, y: to.y + footOffset };
  const goal = { col: Math.floor(toFoot.x / grid.cell), row: Math.floor(toFoot.y / grid.cell) };
  if (!open.has(keyOf(goal.col, goal.row))) {
    return null;
  }
  const startCell = { col: Math.floor(fromFoot.x / grid.cell), row: Math.floor(fromFoot.y / grid.cell) };
  const start = open.has(keyOf(startCell.col, startCell.row)) ? startCell : nearestOpen(grid, fromFoot);
  if (!start) {
    return null;
  }
  const cells = searchCells(grid, start, goal);
  if (!cells) {
    return null;
  }
  const raw = cells.map((cell) => center(grid, cell));
  raw[raw.length - 1] = toFoot;
  const route: Point[] = [];
  let anchor = fromFoot;
  for (let i = 0; i < raw.length; ) {
    let j = raw.length - 1;
    while (j > i && !segmentClear(grid, anchor, raw[j])) {
      j -= 1;
    }
    route.push(raw[j]);
    anchor = raw[j];
    i = j + 1;
  }
  return route.map((point) => ({ x: point.x, y: point.y - footOffset }));
}
