import { Image, type ImageSource } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, View, useWindowDimensions } from 'react-native';
import Reanimated from 'react-native-reanimated';

import { useIslandCameraStyle } from '@/components/island/island-camera';
import { usePlayState } from '@/components/play-state';
import type { IslandZoneId } from '@/constants/island-zones';

const CELL = 16;
const OCEAN_CELL = 64;

const waterDeep = require('@/assets/images/beach/water-deep.png') as ImageSource;
const grass = require('@/assets/images/beach/grass.png') as ImageSource;
const grassDark = require('@/assets/images/beach/grass-dark.png') as ImageSource;
const sand = require('@/assets/images/beach/sand.png') as ImageSource;
const shore = require('@/assets/images/beach/shore.png') as ImageSource;
const waterShallow = require('@/assets/images/beach/water-shallow.png') as ImageSource;

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type Kind = 'grass' | 'grassDark' | 'sand' | 'shallow';

type IslandCell = {
  key: string;
  x: number;
  y: number;
  kind: Kind;
  /** 남쪽 물가. 포말 타일의 흰 띠만 모래와 물 사이에 얹는다. */
  foam?: boolean;
  /** 넓히기로 새로 생긴 칸. 중심에서 멀수록 늦게 올라온다. */
  riseDelay?: number;
};

const SOURCE: Record<Kind, ImageSource> = {
  grass,
  grassDark,
  sand,
  shallow: waterShallow,
};

/** 포말 타일에서 흰 물보라가 시작되는 비율. 모래·물 부분은 잘라 낸다. */
const FOAM_BAND = 0.29;
const FOAM_SCALE = 72;
const FOAM_HEIGHT = 6;

/** 알이 놓인 화면 비율. 중앙 섬의 중심과 맞춘다. */
const ISLAND_CENTER_Y = 0.42;

const keyOf = (x: number, y: number) => `${x},${y}`;

/** 가로로 통통한 타원. 굴곡은 얕아서 끝이 뾰족해지지 않는다. */
function coastLimit(angle: number) {
  return 1 + 0.05 * Math.sin(angle) + 0.1 * Math.sin(2 * angle + 0.6) + 0.055 * Math.sin(3 * angle + 1.4);
}

function insideCore(nx: number, ny: number) {
  return Math.hypot(nx, ny) <= coastLimit(Math.atan2(ny, nx));
}

/** 중앙 섬 반지름을 1로 둔 붙는 땅. 기존 해안 안에 겹쳐 한 덩어리로 이어진다. */
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

function riseDelay(x: number, y: number, cx: number, cy: number) {
  const dist = Math.hypot((x + 0.5) * CELL - cx, (y + 0.5) * CELL - cy);
  return 280 + Math.floor(dist / CELL) * 32;
}

function touchesLand(land: Set<string>, x: number, y: number) {
  return (
    land.has(keyOf(x, y - 1)) ||
    land.has(keyOf(x, y + 1)) ||
    land.has(keyOf(x - 1, y)) ||
    land.has(keyOf(x + 1, y)) ||
    land.has(keyOf(x - 1, y - 1)) ||
    land.has(keyOf(x + 1, y - 1)) ||
    land.has(keyOf(x - 1, y + 1)) ||
    land.has(keyOf(x + 1, y + 1))
  );
}

function smoothCoast(land: Set<string>, minX: number, maxX: number, minY: number, maxY: number) {
  const next = new Set(land);
  const has = (x: number, y: number) => land.has(keyOf(x, y));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const neighbors = [has(x, y - 1), has(x, y + 1), has(x - 1, y), has(x + 1, y)].filter(Boolean).length;
      const here = has(x, y);
      if (here && neighbors <= 1) {
        next.delete(keyOf(x, y));
      }
    }
  }
  return next;
}

/**
 * 열린 구역까지 칸으로 그린다. 가장자리는 모래, 그 안쪽 한 줄은 진한 잔디, 속은 잔디.
 * 바다와 닿는 한 칸은 얕은 물이고, 남쪽 경계에만 포말 띠를 얹는다.
 * growingZoneId 칸은 가운데에서 바깥으로 떠오른다.
 */
function buildIslandCells(width: number, height: number, zones: readonly IslandZoneId[], growingZoneId: IslandZoneId | null): IslandCell[] {
  if (width === 0 || height === 0) {
    return [];
  }
  const base = Math.min(width, height);
  const cx = width * 0.5;
  const cy = height * ISLAND_CENTER_Y;
  const rx = base * 0.4;
  const ry = base * 0.3;
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const reach = 2.15;
  const minX = Math.max(0, Math.floor((cx - rx * reach) / CELL) - 2);
  const maxX = Math.min(cols - 1, Math.ceil((cx + rx * reach) / CELL) + 2);
  const minY = Math.max(0, Math.floor((cy - ry * reach) / CELL) - 2);
  const maxY = Math.min(rows - 1, Math.ceil((cy + ry * reach) / CELL) + 2);
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
    return smoothCoast(set, minX, maxX, minY, maxY);
  };

  const settled = collect(settledZones);
  const land = growing ? collect(fullZones) : settled;

  const isLand = (x: number, y: number) => land.has(keyOf(x, y));
  const cells: IslandCell[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!isLand(x, y)) {
        const beside =
          isLand(x, y - 1) ||
          isLand(x, y + 1) ||
          isLand(x - 1, y) ||
          isLand(x + 1, y) ||
          isLand(x - 1, y - 1) ||
          isLand(x + 1, y - 1) ||
          isLand(x - 1, y + 1) ||
          isLand(x + 1, y + 1);
        if (beside) {
          const alongBeach = isLand(x, y - 1) && (isLand(x - 1, y - 1) || isLand(x + 1, y - 1));
          const fresh = growing != null && !touchesLand(settled, x, y);
          cells.push({
            key: keyOf(x, y),
            x,
            y,
            kind: 'shallow',
            foam: alongBeach,
            riseDelay: fresh ? riseDelay(x, y, cx, cy) : undefined,
          });
        }
        continue;
      }

      const edge = !isLand(x, y - 1) || !isLand(x, y + 1) || !isLand(x - 1, y) || !isLand(x + 1, y);
      const besideEdge = !isLand(x, y - 2) || !isLand(x, y + 2) || !isLand(x - 2, y) || !isLand(x + 2, y);
      let kind: Kind = 'grass';
      if (edge) {
        kind = 'sand';
      } else if (besideEdge) {
        kind = 'grassDark';
      }
      const fresh = growing != null && !settled.has(keyOf(x, y));
      cells.push({ key: keyOf(x, y), x, y, kind, riseDelay: fresh ? riseDelay(x, y, cx, cy) : undefined });
    }
  }
  return cells;
}

export function BeachHome() {
  const cameraStyle = useIslandCameraStyle();
  const { unlockedZones, zoneUnlockReveal } = usePlayState();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [box, setBox] = useState({ width: windowWidth, height: windowHeight });
  const growingZoneId = zoneUnlockReveal?.zoneId ?? null;
  const cells = useMemo(
    () => buildIslandCells(box.width, box.height, unlockedZones, growingZoneId),
    [box.height, box.width, growingZoneId, unlockedZones],
  );

  return (
    <View
      pointerEvents="none"
      style={{ flex: 1 }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}>
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} pointerEvents="none">
        <TileFill source={waterDeep} size={OCEAN_CELL} />
      </View>
      <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, cameraStyle]}>
      {cells.map((cell) =>
        cell.riseDelay == null ? (
          <Image
            key={cell.key}
            source={SOURCE[cell.kind]}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: cell.x * CELL,
              top: cell.y * CELL,
              width: CELL,
              height: CELL,
              ...pixelImageStyle,
            }}
            contentFit="fill"
          />
        ) : (
          <RisingCell key={cell.key} cell={cell} />
        ),
      )}
      {cells.map((cell) => (cell.foam ? <FoamEdge key={`foam-${cell.key}`} x={cell.x} y={cell.y} riseDelay={cell.riseDelay} /> : null))}
      </Reanimated.View>
    </View>
  );
}

function useRise(delay: number | null) {
  const [value] = useState(() => new Animated.Value(delay == null ? 1 : 0));

  useEffect(() => {
    if (delay == null) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const anim = Animated.timing(value, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, value]);

  return {
    opacity: value,
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
  };
}

function RisingCell({ cell }: { cell: IslandCell }) {
  const rise = useRise(cell.riseDelay ?? null);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cell.x * CELL,
        top: cell.y * CELL,
        width: CELL,
        height: CELL,
        ...rise,
      }}>
      <Image
        source={SOURCE[cell.kind]}
        style={{ width: CELL, height: CELL, ...pixelImageStyle }}
        contentFit="fill"
      />
    </Animated.View>
  );
}

/** 포말 타일에서 흰 띠만 남쪽 모래와 물 경계에 붙인다. */
function FoamEdge({ x, y, riseDelay: delay }: { x: number; y: number; riseDelay?: number }) {
  const px = x * CELL;
  const rise = useRise(delay ?? null);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: px,
        top: y * CELL - 3,
        width: CELL,
        height: FOAM_HEIGHT,
        overflow: 'hidden',
        ...rise,
      }}>
      <Image
        source={shore}
        pointerEvents="none"
        style={{
          width: FOAM_SCALE,
          height: FOAM_SCALE,
          marginLeft: -(px % FOAM_SCALE),
          marginTop: -Math.round(FOAM_SCALE * FOAM_BAND),
          ...pixelImageStyle,
        }}
        contentFit="fill"
      />
    </Animated.View>
  );
}

function TileFill({ source, size }: { source: ImageSource; size: number }) {
  const { width, height: windowHeight } = useWindowDimensions();
  const [measured, setMeasured] = useState(0);
  const height = Math.max(windowHeight, measured);
  const cols = Math.max(1, Math.ceil(width / size));
  const rows = Math.max(1, Math.ceil(height / size));

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => {
        const next = Math.ceil(event.nativeEvent.layout.height);
        setMeasured((current) => (current === next ? current : next));
      }}>
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {Array.from({ length: cols }, (_, col) => (
            <Image
              key={col}
              source={source}
              style={{ width: size, height: size, ...pixelImageStyle }}
              contentFit="fill"
            />
          ))}
        </View>
      ))}
    </View>
  );
}
