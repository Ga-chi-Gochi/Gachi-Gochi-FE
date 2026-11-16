// 화산재 구름. components/island/volcano-gas.tsx 의 웹(캔버스) 그리기를 그대로 옮겼다.
// 화면 좌표(dp)로 그리고, 4dp 칸을 같은 투명도끼리 가로로 묶어 칠한다.
export const LAVA_FILL_MS = 1200;
export const LAVA_BOIL_MS = 480;
export const LAVA_SPILL_MS = 360;

export const HOLD_MS = 360;
export const CLEAR_MS = 1700;
const CELL = 4;
const SOFT = 28;
const SCALLOP_MAX = 52;
const BURST_MS = 280;
const BURST_COVER = 0.36;
const BURST_STEP = 48;
export const CLOUD = '#D9D4DC';

export type DrawContext = {
  clearRect: (x: number, y: number, w: number, h: number) => void;
  fillRect: (x: number, y: number, w: number, h: number) => void;
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  fillStyle: string;
  globalAlpha: number;
};

export function paintCloud(
  context: DrawContext,
  width: number,
  height: number,
  originX: number,
  originY: number,
  spread: number,
  hole: number,
) {
  context.clearRect(0, 0, width, height);
  const solidReach = spread - SOFT - SCALLOP_MAX;
  const emptyReach = spread + SCALLOP_MAX;
  const solid2 = solidReach > 0 ? solidReach * solidReach : 0;
  const empty2 = emptyReach * emptyReach;
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const col0 = Math.max(0, Math.floor((originX - emptyReach) / CELL));
  const col1 = Math.min(cols, Math.ceil((originX + emptyReach) / CELL));
  const row0 = Math.max(0, Math.floor((originY - emptyReach) / CELL));
  const row1 = Math.min(rows, Math.ceil((originY + emptyReach) / CELL));
  for (let row = row0; row < row1; row += 1) {
    const y = row * CELL;
    const dy = y + CELL / 2 - originY;
    let runStart = -1;
    let runAlpha = 0;
    const flush = (endCol: number) => {
      if (runStart < 0 || runAlpha <= 0) {
        runStart = -1;
        return;
      }
      context.globalAlpha = runAlpha;
      context.fillRect(runStart * CELL, y, (endCol - runStart) * CELL, CELL);
      runStart = -1;
    };
    for (let col = col0; col < col1; col += 1) {
      const x = col * CELL;
      const dx = x + CELL / 2 - originX;
      const dist2 = dx * dx + dy * dy;
      let alpha = 0;
      if (hole <= 0 && solidReach > 0 && dist2 <= solid2) {
        alpha = 1;
      } else if (dist2 >= empty2) {
        alpha = 0;
      } else {
        const dist = Math.sqrt(dist2);
        const rank = scallopRank(dist, Math.atan2(dy, dx));
        alpha = Math.round(cellFade(rank, spread, hole) * 10) / 10;
      }
      if (alpha <= 0) {
        flush(col);
        continue;
      }
      if (runStart < 0) {
        runStart = col;
        runAlpha = alpha;
      } else if (alpha !== runAlpha) {
        flush(col);
        runStart = col;
        runAlpha = alpha;
      }
    }
    flush(col1);
  }
  context.globalAlpha = 1;
}

export function coverRank(width: number, height: number, originX: number, originY: number) {
  const far = Math.hypot(Math.max(originX, width - originX), Math.max(originY, height - originY));
  return far + SOFT;
}

export function scallopRank(dist: number, angle: number) {
  const step = (Math.PI * 2) / 12;
  let delta = ((angle + 0.7) % step + step) % step;
  if (delta > step / 2) {
    delta = step - delta;
  }
  const across = delta / (step / 2);
  const cap = Math.sqrt(Math.max(0, 1 - across * across));
  const mid = Math.max(0, Math.cos(angle * 5 + 1.3));
  const down = Math.max(0, Math.sin(angle));
  return Math.max(0, dist - cap * 22 - mid * 10 - down * 18);
}

export function cloudMotion(elapsed: number, maxRank: number) {
  const burstStart = LAVA_FILL_MS + LAVA_BOIL_MS;
  if (elapsed <= burstStart) {
    return { target: 0, step: BURST_STEP };
  }
  const duration = BURST_MS / BURST_COVER;
  const t = Math.min(1, (elapsed - burstStart) / duration);
  return { target: t * maxRank, step: BURST_STEP };
}

export function cellFade(rank: number, spread: number, hole: number) {
  return smooth(spread - rank) * (1 - smooth(hole - rank));
}

export function smooth(distance: number) {
  const t = distance / SOFT;
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return t * t * (3 - 2 * t);
}
