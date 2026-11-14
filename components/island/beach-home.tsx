import { Image, type ImageSource } from 'expo-image';
import { useMemo, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';

const CELL = 16;
const OCEAN_CELL = 64;

const waterDeep = require('@/assets/images/beach/water-deep.png') as ImageSource;
const grass = require('@/assets/images/beach/grass.png') as ImageSource;
const grassDark = require('@/assets/images/beach/grass-dark.png') as ImageSource;
const sand = require('@/assets/images/beach/sand.png') as ImageSource;
const shore = require('@/assets/images/beach/shore.png') as ImageSource;
const waterShallow = require('@/assets/images/beach/water-shallow.png') as ImageSource;

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type Kind = 'grass' | 'grassDark' | 'sand' | 'shore' | 'shallow';

type IslandCell = {
  key: string;
  x: number;
  y: number;
  kind: Kind;
};

const SOURCE: Record<Kind, ImageSource> = {
  grass,
  grassDark,
  sand,
  shore,
  shallow: waterShallow,
};

/** 알이 놓인 화면 비율. 중앙 섬의 중심과 맞춘다. */
const ISLAND_CENTER_Y = 0.42;

const keyOf = (x: number, y: number) => `${x},${y}`;

/** 가로로 통통한 타원. 굴곡은 얕아서 끝이 뾰족해지지 않는다. */
function coastLimit(angle: number) {
  return 1 + 0.05 * Math.sin(angle) + 0.1 * Math.sin(2 * angle + 0.6) + 0.055 * Math.sin(3 * angle + 1.4);
}

function insideIsland(px: number, py: number, cx: number, cy: number, rx: number, ry: number) {
  const nx = (px - cx) / rx;
  const ny = (py - cy) / ry;
  return Math.hypot(nx, ny) <= coastLimit(Math.atan2(ny, nx));
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
 * 중앙 섬만 칸으로 그린다. 가장자리는 모래, 그 안쪽 한 줄은 진한 잔디, 속은 잔디.
 * 포말 타일은 위가 모래, 아래가 물이라 남쪽 해안에만 둔다.
 */
function buildIslandCells(width: number, height: number): IslandCell[] {
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
  const minX = Math.max(0, Math.floor((cx - rx * 1.7) / CELL) - 2);
  const maxX = Math.min(cols - 1, Math.ceil((cx + rx * 1.7) / CELL) + 2);
  const minY = Math.max(0, Math.floor((cy - ry * 1.7) / CELL) - 2);
  const maxY = Math.min(rows - 1, Math.ceil((cy + ry * 1.85) / CELL) + 2);

  let land = new Set<string>();
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (insideIsland((x + 0.5) * CELL, (y + 0.5) * CELL, cx, cy, rx, ry)) {
        land.add(keyOf(x, y));
      }
    }
  }
  land = smoothCoast(land, minX, maxX, minY, maxY);

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
          isLand(x + 1, y + 1) ||
          isLand(x, y - 2) ||
          isLand(x, y + 2) ||
          isLand(x - 2, y) ||
          isLand(x + 2, y);
        if (beside) {
          cells.push({ key: keyOf(x, y), x, y, kind: 'shallow' });
        }
        continue;
      }

      const edge = !isLand(x, y - 1) || !isLand(x, y + 1) || !isLand(x - 1, y) || !isLand(x + 1, y);
      const facesSouth = !isLand(x, y + 1) && isLand(x, y - 1) && (isLand(x - 1, y) || isLand(x + 1, y));
      const besideEdge = !isLand(x, y - 2) || !isLand(x, y + 2) || !isLand(x - 2, y) || !isLand(x + 2, y);
      let kind: Kind = 'grass';
      if (facesSouth) {
        kind = 'shore';
      } else if (edge) {
        kind = 'sand';
      } else if (besideEdge) {
        kind = 'grassDark';
      }
      cells.push({ key: keyOf(x, y), x, y, kind });
    }
  }
  return cells;
}

export function BeachHome() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [box, setBox] = useState({ width: windowWidth, height: windowHeight });
  const cells = useMemo(() => buildIslandCells(box.width, box.height), [box.height, box.width]);

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}>
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} pointerEvents="none">
        <TileFill source={waterDeep} size={OCEAN_CELL} />
      </View>
      {cells.map((cell) => (
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
      ))}
    </View>
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
