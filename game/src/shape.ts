// 섬 땅 모양 계산. components/island/beach-home.tsx 의 순수 함수들을 그대로 옮겼다 (그림 결과가 RN판과 같아야 한다).
// 좌표 단위는 RN 화면 dp 와 같다. 한 칸 CELL = 32.
import type { IslandZoneId } from '@/constants/island-zones';

export const CELL = 32;

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

export type SurfaceGrain = {
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
const COAST_ROWS = 5;

/** 이 값보다 아래인 남쪽 가장자리에만 파도를 붙인다. */
const SOUTH_SHORE = 0.4;


type IslandFrame = { cx: number; cy: number; rx: number; ry: number };


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
export function islandFrame(width: number, height: number): IslandFrame {
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

export function volcanoOrigin(width: number, height: number) {
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
export function buildIslandCells(
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

/** 잔디 타일 사이로 바다가 비치지 않게 1px 겹친다. */
export const TILE_BLEED = 1;
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
    let runX = -1;
    let runSand = false;
    const flush = (x: number) => {
      if (runX < 0) {
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
      runX = -1;
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
      if (runX < 0) {
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

