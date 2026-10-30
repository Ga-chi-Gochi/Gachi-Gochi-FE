import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import {
  ISLAND_GRID_H,
  ISLAND_GRID_W,
  VOLCANO_CELL,
  cellsAddedByZone,
  isLand,
  landCellSet,
  parseCell,
} from '@/constants/island-terrain';
import type { IslandZoneId } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export type ExpandPhase = 'idle' | 'rumble' | 'erupt' | 'grow' | 'done';

type IslandTerrainProps = {
  mapW: number;
  mapH: number;
  unlockedZones: IslandZoneId[];
  /** 확장 연출 중인 구역 (아직 persist 전) */
  expandingZoneId?: IslandZoneId | null;
  expandPhase: ExpandPhase;
  highlightZoneId?: IslandZoneId | null;
};

function LandCell({
  left,
  top,
  sizeW,
  sizeH,
  checker,
  edge,
  appearing,
  delay,
}: {
  left: number;
  top: number;
  sizeW: number;
  sizeH: number;
  checker: boolean;
  edge: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  appearing: boolean;
  delay: number;
}) {
  const [appear] = useState(() => new Animated.Value(appearing ? 0 : 1));

  useEffect(() => {
    if (!appearing) {
      appear.setValue(1);
      return;
    }
    appear.setValue(0);
    Animated.timing(appear, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appear, appearing, delay]);

  const shore = 3;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: sizeW,
        height: sizeH,
        backgroundColor: checker ? pixel.grassDeep : pixel.grass,
        opacity: appearing
          ? appear.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
          : 1,
        transform: appearing
          ? [
              {
                scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              },
            ]
          : undefined,
      }}>
      {/* 얕은 줄무늬 */}
      {checker ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: sizeW * 0.15,
            width: sizeW * 0.2,
            height: sizeH,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        />
      ) : null}
      {/* 해안선 — 물과 맞닿은 면만 모래 */}
      {edge.top ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: shore, backgroundColor: '#F2E6C4' }} />
      ) : null}
      {edge.bottom ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: shore + 1, backgroundColor: pixel.sand }} />
      ) : null}
      {edge.left ? (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: shore, backgroundColor: '#F2E6C4' }} />
      ) : null}
      {edge.right ? (
        <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: shore, backgroundColor: '#F2E6C4' }} />
      ) : null}
      {edge.bottom ? (
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: pixel.soil,
            opacity: 0.55,
          }}
        />
      ) : null}
    </Animated.View>
  );
}

function EruptFx({ mapW, mapH, active }: { mapW: number; mapH: number; active: boolean }) {
  const { scale } = useResponsive();
  const cellW = mapW / ISLAND_GRID_W;
  const cellH = mapH / ISLAND_GRID_H;
  const left = VOLCANO_CELL.x * cellW;
  const top = VOLCANO_CELL.y * cellH;
  const [burst] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      burst.setValue(0);
      return;
    }
    burst.setValue(0);
    Animated.sequence([
      Animated.timing(burst, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 0.4, duration: 420, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [active, burst]);

  if (!active) {
    return null;
  }

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: left - scale(28),
          top: top - scale(40),
          width: scale(70),
          height: scale(70),
          borderRadius: scale(35),
          backgroundColor: pixel.lava,
          opacity: burst.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
          transform: [
            {
              scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.6] }),
            },
          ],
        }}
      />
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        return (
          <Animated.View
            key={`ember-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: left + scale(8),
              top: top,
              width: scale(8),
              height: scale(8),
              backgroundColor: i % 2 === 0 ? pixel.lava : pixel.tangerine,
              opacity: burst,
              transform: [
                {
                  translateX: burst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos(angle) * scale(36)],
                  }),
                },
                {
                  translateY: burst.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.sin(angle) * scale(36) - scale(10)],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </>
  );
}

export function IslandTerrain({
  mapW,
  mapH,
  unlockedZones,
  expandingZoneId,
  expandPhase,
  highlightZoneId,
}: IslandTerrainProps) {
  const { scale } = useResponsive();
  const cellW = mapW / ISLAND_GRID_W;
  const cellH = mapH / ISLAND_GRID_H;

  const baseSet = useMemo(() => landCellSet(unlockedZones), [unlockedZones]);
  const growingKeys = useMemo(() => {
    if (!expandingZoneId || expandPhase === 'idle') {
      return new Set<string>();
    }
    // rumble/erupt: 아직 새 땅 없음. grow/done: 새 셀 표시
    if (expandPhase === 'rumble' || expandPhase === 'erupt') {
      return new Set<string>();
    }
    return new Set(cellsAddedByZone(unlockedZones, expandingZoneId));
  }, [expandPhase, expandingZoneId, unlockedZones]);

  const visibleSet = useMemo(() => {
    const set = new Set(baseSet);
    for (const k of growingKeys) {
      set.add(k);
    }
    return set;
  }, [baseSet, growingKeys]);

  const cells = useMemo(() => {
    const list: {
      key: string;
      x: number;
      y: number;
      appearing: boolean;
      delay: number;
      edge: { top: boolean; right: boolean; bottom: boolean; left: boolean };
    }[] = [];

    for (const k of visibleSet) {
      const { x, y } = parseCell(k);
      const appearing = growingKeys.has(k);
      const dist =
        Math.hypot(x + 0.5 - VOLCANO_CELL.x, y + 0.5 - VOLCANO_CELL.y) +
        (expandingZoneId === 'east' ? x * 0.15 : 0) +
        (expandingZoneId === 'west' ? (ISLAND_GRID_W - x) * 0.15 : 0) +
        (expandingZoneId === 'south' ? y * 0.12 : 0);
      list.push({
        key: k,
        x,
        y,
        appearing,
        delay: appearing ? Math.floor(dist * 55) : 0,
        edge: {
          top: !isLand(visibleSet, x, y - 1),
          right: !isLand(visibleSet, x + 1, y),
          bottom: !isLand(visibleSet, x, y + 1),
          left: !isLand(visibleSet, x - 1, y),
        },
      });
    }
    return list;
  }, [expandingZoneId, growingKeys, visibleSet]);

  const erupting = expandPhase === 'erupt' || expandPhase === 'rumble';
  const [shake] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (expandPhase !== 'rumble' && expandPhase !== 'erupt') {
      shake.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 40, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 40, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      shake.setValue(0);
    };
  }, [expandPhase, shake]);

  const volcanoLeft = VOLCANO_CELL.x * cellW - scale(18);
  const volcanoTop = VOLCANO_CELL.y * cellH - scale(28);

  return (
    <Animated.View
      style={{
        width: mapW,
        height: mapH,
        transform: [
          {
            translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }),
          },
        ],
      }}>
      {cells.map((cell) => (
        <LandCell
          key={cell.key}
          left={cell.x * cellW}
          top={cell.y * cellH}
          sizeW={cellW + 0.6}
          sizeH={cellH + 0.6}
          checker={(cell.x + cell.y) % 2 === 0}
          edge={cell.edge}
          appearing={cell.appearing && expandPhase === 'grow'}
          delay={cell.delay}
        />
      ))}

      {/* 하이라이트 (배치/확장 구역) */}
      {highlightZoneId ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
          }}
        />
      ) : null}

      <EruptFx mapW={mapW} mapH={mapH} active={erupting} />

      <View style={{ position: 'absolute', left: volcanoLeft, top: volcanoTop }}>
        <PixelSprite id={erupting ? 'volcano-erupt' : 'volcano'} size={scale(40)} />
      </View>
    </Animated.View>
  );
}
