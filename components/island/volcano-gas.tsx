import { useEffect, useMemo, useState } from 'react';
import { Animated, useWindowDimensions, View } from 'react-native';

import { volcanoMouthPoint } from '@/components/island/beach-home';
import { useVolcanoEruption } from '@/components/island/volcano-eruption';
import { usePlayState } from '@/components/play-state';

const STEP = 16;
const COVER_MS = 900;
const HOLD_MS = 280;
const CLEAR_MS = 520;

const SMOKE = ['#d4d0c4', '#a8a498', '#6e6a60', '#ece8dc', '#4a4842', '#c0b8a4'];

/** 화산 입구에서 픽셀 연기가 퍼져 화면을 덮었다가 걷힌다. */
export function VolcanoGas() {
  const { phase, finish } = useVolcanoEruption();
  if (phase !== 'gas') {
    return null;
  }
  return <GasCover onDone={finish} />;
}

function GasCover({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const { revealExpandedZone } = usePlayState();
  const origin = volcanoMouthPoint(width, height);
  const [reach, setReach] = useState(0);
  const [opacity] = useState(() => new Animated.Value(1));

  const puffs = useMemo(() => {
    const list: { x: number; y: number; dist: number; color: string }[] = [];
    for (let y = 0; y < height; y += STEP) {
      for (let x = 0; x < width; x += STEP) {
        const dist = Math.hypot(x + STEP / 2 - origin.x, y + STEP / 2 - origin.y);
        const color = SMOKE[(Math.floor(x / STEP) + Math.floor(y / STEP) * 3) % SMOKE.length] ?? SMOKE[0];
        list.push({ x, y, dist, color });
      }
    }
    return list;
  }, [height, origin.x, origin.y, width]);

  const maxDist = useMemo(() => {
    return Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) + STEP;
  }, [height, origin.x, origin.y, width]);

  useEffect(() => {
    const started = Date.now();
    let hold: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / COVER_MS);
      setReach(t * maxDist);
      if (t < 1) {
        return;
      }
      clearInterval(timer);
      revealExpandedZone();
      hold = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: CLEAR_MS,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            onDone();
          }
        });
      }, HOLD_MS);
    }, 40);
    return () => {
      clearInterval(timer);
      if (hold) {
        clearTimeout(hold);
      }
    };
  }, [maxDist, onDone, opacity, revealExpandedZone]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 80,
        opacity,
      }}>
      {puffs.map((puff) =>
        puff.dist <= reach ? (
          <View
            key={`${puff.x},${puff.y}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: puff.x,
              top: puff.y,
              width: STEP,
              height: STEP,
              backgroundColor: puff.color,
            }}
          />
        ) : null,
      )}
    </Animated.View>
  );
}
