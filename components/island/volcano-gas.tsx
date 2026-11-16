import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import { craterCloudPoint } from '@/components/island/beach-home';
import { useIslandCameraSnapshot } from '@/components/island/island-camera';
import { LAVA_BOIL_MS, LAVA_FILL_MS, useVolcanoEruption } from '@/components/island/volcano-eruption';
import { usePlayState } from '@/components/play-state';

const HOLD_MS = 360;
const CLEAR_MS = 1700;
const CELL = 4;
const SOFT = 28;
const SCALLOP_MAX = 52;
const BURST_MS = 280;
const BURST_COVER = 0.36;
const BURST_STEP = 48;
const CLOUD = '#D9D4DC';
const HOST_ID = 'volcano-gas-host';

const BAND = 4;
const MOUNT_PER_FRAME = 8;

type Puff = { key: string; x: number; y: number; size: number };
type CloudBand = { key: string; rank: number; puffs: Puff[] };

type DrawContext = {
  clearRect: (x: number, y: number, w: number, h: number) => void;
  fillRect: (x: number, y: number, w: number, h: number) => void;
  setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  fillStyle: string;
  globalAlpha: number;
};

type WebCanvas = {
  width: number;
  height: number;
  style: {
    position: string;
    left: string;
    top: string;
    width: string;
    height: string;
    pointerEvents: string;
    imageRendering: string;
  };
  getContext: (type: '2d') => DrawContext | null;
};

type WebParent = { appendChild: (node: WebCanvas) => void; removeChild: (node: WebCanvas) => void };

/** 용암이 끓는 동안 자리를 잡고, 퍼질 때는 가장자리만 조금씩 칠한다. */
export function VolcanoGas() {
  const { phase, finish } = useVolcanoEruption();
  if (phase === 'idle') {
    return null;
  }
  return <AshCloud playing={phase === 'gas'} onDone={finish} />;
}

function AshCloud({ playing, onDone }: { playing: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const camera = useIslandCameraSnapshot();
  const { revealExpandedZone } = usePlayState();
  const origin = useMemo(() => {
    const mouth = craterCloudPoint(width, height);
    return {
      x: width / 2 + (mouth.x - width / 2) * camera.zoom + camera.x,
      y: height / 2 + (mouth.y - height / 2) * camera.zoom + camera.y,
    };
  }, [camera.x, camera.y, camera.zoom, height, width]);

  if (Platform.OS === 'web') {
    return (
      <WebAshCloud
        onDone={onDone}
        revealExpandedZone={revealExpandedZone}
        width={width}
        height={height}
        originX={origin.x}
        originY={origin.y}
      />
    );
  }
  return <NativeAshCloud playing={playing} onDone={onDone} originX={origin.x} originY={origin.y} />;
}

function WebAshCloud({
  onDone,
  revealExpandedZone,
  width,
  height,
  originX,
  originY,
}: {
  onDone: () => void;
  revealExpandedZone: () => void;
  width: number;
  height: number;
  originX: number;
  originY: number;
}) {
  const onDoneRef = useRef(onDone);
  const revealRef = useRef(revealExpandedZone);
  useEffect(() => {
    onDoneRef.current = onDone;
    revealRef.current = revealExpandedZone;
  }, [onDone, revealExpandedZone]);

  return (
    <View
      nativeID={HOST_ID}
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 80 }}>
      <WebCloudPaint
        width={width}
        height={height}
        originX={originX}
        originY={originY}
        onDoneRef={onDoneRef}
        revealRef={revealRef}
      />
    </View>
  );
}

function WebCloudPaint({
  width,
  height,
  originX,
  originY,
  onDoneRef,
  revealRef,
}: {
  width: number;
  height: number;
  originX: number;
  originY: number;
  onDoneRef: { current: () => void };
  revealRef: { current: () => void };
}) {
  useEffect(() => {
    const scope = globalThis as {
      document?: {
        getElementById: (id: string) => WebParent | null;
        createElement: (tag: 'canvas') => WebCanvas;
      };
      devicePixelRatio?: number;
    };
    const parent = scope.document?.getElementById(HOST_ID);
    if (!scope.document || !parent || width <= 0 || height <= 0) {
      return;
    }
    const canvas = scope.document.createElement('canvas');
    const dpr = Math.min(2, scope.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.pointerEvents = 'none';
    canvas.style.imageRendering = 'pixelated';
    parent.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
      parent.removeChild(canvas);
      return;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = CLOUD;

    let frame = 0;
    let hold: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let revealed = false;
    let distance = 0;
    const maxRank = coverRank(width, height, originX, originY);
    const started = performance.now();
    const grow = (now: number) => {
      if (stopped) {
        return;
      }
      const motion = cloudMotion(now - started, maxRank);
      if (motion.target <= 0 && distance <= 0) {
        frame = requestAnimationFrame(grow);
        return;
      }
      distance = Math.min(motion.target, distance + motion.step);
      paintCloud(context, width, height, originX, originY, distance, 0);
      if (distance > 48) {
        canvas.style.pointerEvents = 'auto';
      }
      if (distance < maxRank - 0.5) {
        frame = requestAnimationFrame(grow);
        return;
      }
      if (!revealed) {
        revealed = true;
        revealRef.current();
      }
      hold = setTimeout(() => {
        const clearStarted = performance.now();
        const clear = (tick: number) => {
          if (stopped) {
            return;
          }
          const u = Math.min(1, (tick - clearStarted) / CLEAR_MS);
          const curved = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
          paintCloud(context, width, height, originX, originY, maxRank, curved * maxRank);
          if (u < 1) {
            frame = requestAnimationFrame(clear);
            return;
          }
          onDoneRef.current();
        };
        frame = requestAnimationFrame(clear);
      }, HOLD_MS);
    };
    frame = requestAnimationFrame(grow);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      if (hold) {
        clearTimeout(hold);
      }
      parent.removeChild(canvas);
    };
  }, [height, onDoneRef, originX, originY, revealRef, width]);

  return null;
}

function NativeAshCloud({
  playing,
  onDone,
  originX,
  originY,
}: {
  playing: boolean;
  onDone: () => void;
  originX: number;
  originY: number;
}) {
  const { width, height } = useWindowDimensions();
  const { revealExpandedZone } = usePlayState();
  const [spread, setSpread] = useState(0);
  const [hole, setHole] = useState(0);
  const [ready, setReady] = useState(0);
  const field = useMemo(() => buildField(width, height, originX, originY), [height, originX, originY, width]);

  useEffect(() => {
    let frame = 0;
    let index = 0;
    const mount = () => {
      index = Math.min(field.bands.length, index + MOUNT_PER_FRAME);
      setReady(index);
      if (index < field.bands.length) {
        frame = requestAnimationFrame(mount);
      }
    };
    frame = requestAnimationFrame(mount);
    return () => cancelAnimationFrame(frame);
  }, [field]);

  useEffect(() => {
    let frame = 0;
    let hold: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let distance = 0;
    const started = performance.now();
    const grow = (now: number) => {
      if (stopped) {
        return;
      }
      const motion = cloudMotion(now - started, field.maxRank);
      if (motion.target <= 0 && distance <= 0) {
        frame = requestAnimationFrame(grow);
        return;
      }
      distance = Math.min(motion.target, distance + motion.step);
      setSpread(distance);
      if (distance < field.maxRank - 0.5) {
        frame = requestAnimationFrame(grow);
        return;
      }
      revealExpandedZone();
      hold = setTimeout(() => {
        const clearStarted = performance.now();
        const clear = (tick: number) => {
          if (stopped) {
            return;
          }
          const u = Math.min(1, (tick - clearStarted) / CLEAR_MS);
          const curved = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
          setHole(curved * field.maxRank);
          if (u < 1) {
            frame = requestAnimationFrame(clear);
            return;
          }
          onDone();
        };
        frame = requestAnimationFrame(clear);
      }, HOLD_MS);
    };
    frame = requestAnimationFrame(grow);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      if (hold) {
        clearTimeout(hold);
      }
    };
  }, [field.maxRank, onDone, revealExpandedZone]);

  return (
    <View
      pointerEvents={playing && spread > 8 ? 'auto' : 'none'}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 80 }}>
      {field.bands.slice(0, ready).map((band) => (
        <AshBand key={band.key} band={band} puffOpacity={quantize(cellFade(band.rank, spread, hole))} />
      ))}
    </View>
  );
}

const AshBand = memo(function AshBand({ band, puffOpacity }: { band: CloudBand; puffOpacity: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: puffOpacity }}>
      {band.puffs.map((puff) => (
        <View
          key={puff.key}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: puff.x - puff.size / 2,
            top: puff.y - puff.size / 2,
            width: puff.size,
            height: puff.size,
            borderRadius: puff.size / 2,
            backgroundColor: CLOUD,
          }}
        />
      ))}
    </View>
  );
});

function buildField(width: number, height: number, cx: number, cy: number) {
  const dx = 12;
  const dy = 10;
  const grouped = new Map<number, CloudBand>();
  let maxRank = 0;
  const cols = Math.ceil(width / dx) + 3;
  const rows = Math.ceil(height / dy) + 3;
  for (let row = -1; row < rows; row += 1) {
    const y = row * dy;
    const stagger = row % 2 === 0 ? 0 : dx / 2;
    for (let col = -1; col < cols; col += 1) {
      const x = col * dx + stagger;
      const ox = x - cx;
      const oy = y - cy;
      const rank = scallopRank(Math.hypot(ox, oy), Math.atan2(oy, ox));
      maxRank = Math.max(maxRank, rank);
      const bucket = Math.max(0, Math.floor(rank / BAND));
      const band = grouped.get(bucket) ?? { key: `band-${bucket}`, rank: bucket * BAND + BAND / 2, puffs: [] };
      const size = 26 + (Math.abs(col * 5 + row * 3) % 3) * 4;
      band.puffs.push({ key: `${col},${row}`, x, y, size });
      grouped.set(bucket, band);
    }
  }
  const bands = [...grouped.values()].sort((a, b) => a.rank - b.rank);
  return { bands, maxRank: maxRank + SOFT };
}

function paintCloud(
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

function coverRank(width: number, height: number, originX: number, originY: number) {
  const far = Math.hypot(Math.max(originX, width - originX), Math.max(originY, height - originY));
  return far + SOFT;
}

/** 작은 둥근 덩어리가 가장자리를 이룬다. 거리는 끊기지 않고, 아래쪽이 조금 먼저 내려온다. */
function scallopRank(dist: number, angle: number) {
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

/** 터지는 속도 그대로 화면이 덮일 때까지 이어진다. 중간에 느려지지 않는다. */
function cloudMotion(elapsed: number, maxRank: number) {
  const burstStart = LAVA_FILL_MS + LAVA_BOIL_MS;
  if (elapsed <= burstStart) {
    return { target: 0, step: BURST_STEP };
  }
  const duration = BURST_MS / BURST_COVER;
  const t = Math.min(1, (elapsed - burstStart) / duration);
  return { target: t * maxRank, step: BURST_STEP };
}

function cellFade(rank: number, spread: number, hole: number) {
  return smooth(spread - rank) * (1 - smooth(hole - rank));
}

function smooth(distance: number) {
  const t = distance / SOFT;
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return t * t * (3 - 2 * t);
}

function quantize(value: number) {
  return Math.round(Math.min(1, Math.max(0, value)) * 40) / 40;
}
