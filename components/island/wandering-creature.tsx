import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import {
  GrowthCreatureSprite,
  type CreatureFacing,
  type CreaturePose,
} from '@/components/pixel/pixel-sprite';
import type { GrowthStage } from '@/constants/growth';
import { nearestWalkPoint } from '@/constants/island-terrain';
import { useResponsive } from '@/hooks/use-responsive';

export type WalkPoint = { x: number; y: number };

type WanderingCreatureProps = {
  growthStage: GrowthStage;
  /** 열린 섬 타일 위의 점들 — 섬 확장 시 늘어남 */
  walkPoints: WalkPoint[];
  paused?: boolean;
  onPress: (pos: { x: number; y: number }) => void;
};

/** px/초 — 섬에서 노는 동물 느낌 */
const WALK_SPEED = 16;
const IDLE_MS_MIN = 1600;
const IDLE_MS_MAX = 4200;
const MOVE_MS_MIN = 3200;
const MOVE_MS_MAX = 11000;
const WALK_FRAME_MS = 280;

function rand(min: number, max: number) {
  return min + Math.random() * Math.max(0, max - min);
}

function pickPoint(points: WalkPoint[], avoid?: WalkPoint | null): WalkPoint | null {
  if (points.length === 0) {
    return null;
  }
  if (points.length === 1) {
    return points[0];
  }
  let next = points[Math.floor(Math.random() * points.length)];
  if (avoid) {
    for (let i = 0; i < 4; i += 1) {
      const candidate = points[Math.floor(Math.random() * points.length)];
      if (Math.hypot(candidate.x - avoid.x, candidate.y - avoid.y) > 18) {
        next = candidate;
        break;
      }
    }
  }
  return next;
}

export function WanderingCreature({ growthStage, walkPoints, paused, onPress }: WanderingCreatureProps) {
  const { scale } = useResponsive();
  const size = scale(growthStage.level >= 4 ? 44 : growthStage.level >= 3 ? 40 : 36);
  const start = walkPoints[0] ?? { x: 0, y: 0 };
  const [x] = useState(() => new Animated.Value(start.x));
  const [y] = useState(() => new Animated.Value(start.y));
  const [bob] = useState(() => new Animated.Value(0));
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState<CreatureFacing>('right');
  const [pose, setPose] = useState<CreaturePose>('idle');
  const posRef = useRef({ x: start.x, y: start.y });
  const walkRef = useRef<Animated.CompositeAnimation | null>(null);
  const pausedRef = useRef(Boolean(paused));
  const pointsRef = useRef(walkPoints);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const walkOnceRef = useRef<() => void>(() => undefined);
  const bobLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const clearFrameTimer = () => {
    if (frameRef.current) {
      clearInterval(frameRef.current);
      frameRef.current = null;
    }
  };

  const startWalkFrames = (nextFacing: CreatureFacing) => {
    setFacing(nextFacing);
    setMoving(true);
    setPose('walk-a');
    clearFrameTimer();
    let step = 0;
    frameRef.current = setInterval(() => {
      step += 1;
      setPose(step % 2 === 0 ? 'walk-a' : 'walk-b');
    }, WALK_FRAME_MS);
  };

  const stopWalkFrames = () => {
    clearFrameTimer();
    setMoving(false);
    setPose('idle');
  };

  useEffect(() => {
    pausedRef.current = Boolean(paused);
  }, [paused]);

  useEffect(() => {
    pointsRef.current = walkPoints;
    const nearest = nearestWalkPoint(walkPoints, posRef.current);
    if (!nearest || walkPoints.length === 0) {
      return;
    }
    const onLand = walkPoints.some(
      (p) => Math.hypot(p.x - posRef.current.x, p.y - posRef.current.y) < 28,
    );
    if (!onLand) {
      walkRef.current?.stop();
      const dist = Math.hypot(nearest.x - posRef.current.x, nearest.y - posRef.current.y);
      const duration = Math.min(MOVE_MS_MAX, Math.max(1200, (dist / WALK_SPEED) * 1000));
      const nextFacing: CreatureFacing = nearest.x >= posRef.current.x ? 'right' : 'left';
      startWalkFrames(nextFacing);
      walkRef.current = Animated.parallel([
        Animated.timing(x, {
          toValue: nearest.x,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: nearest.y,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]);
      walkRef.current.start(({ finished }) => {
        if (finished) {
          stopWalkFrames();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-home when land set changes
  }, [walkPoints, x, y]);

  useEffect(() => {
    const idX = x.addListener(({ value }) => {
      posRef.current.x = value;
    });
    const idY = y.addListener(({ value }) => {
      posRef.current.y = value;
    });
    return () => {
      x.removeListener(idX);
      y.removeListener(idY);
    };
  }, [x, y]);

  /** idle일 때만 천천히 숨쉬기 바운스 */
  useEffect(() => {
    bobLoopRef.current?.stop();
    if (moving) {
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    bobLoopRef.current = loop;
    loop.start();
    return () => loop.stop();
  }, [bob, moving]);

  useEffect(() => {
    walkOnceRef.current = () => {
      if (pausedRef.current) {
        return;
      }
      const points = pointsRef.current;
      const target = pickPoint(points, posRef.current);
      if (!target) {
        return;
      }
      const dist = Math.hypot(target.x - posRef.current.x, target.y - posRef.current.y);
      if (dist < 8) {
        scheduleRef.current = setTimeout(() => {
          walkOnceRef.current();
        }, rand(IDLE_MS_MIN, IDLE_MS_MAX));
        return;
      }
      const duration = Math.min(MOVE_MS_MAX, Math.max(MOVE_MS_MIN, (dist / WALK_SPEED) * 1000));
      const nextFacing: CreatureFacing = target.x >= posRef.current.x ? 'right' : 'left';
      walkRef.current?.stop();
      startWalkFrames(nextFacing);
      walkRef.current = Animated.parallel([
        Animated.timing(x, {
          toValue: target.x,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: target.y,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]);
      walkRef.current.start(({ finished }) => {
        stopWalkFrames();
        if (!finished || pausedRef.current) {
          return;
        }
        scheduleRef.current = setTimeout(() => {
          walkOnceRef.current();
        }, rand(IDLE_MS_MIN, IDLE_MS_MAX));
      });
    };
    // start/stopWalkFrames는 이 effect 스코프의 로컬 헬퍼와 동일 동작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  useEffect(() => {
    if (paused) {
      walkRef.current?.stop();
      clearFrameTimer();
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current);
      }
      const idleTimer = setTimeout(() => {
        setMoving(false);
        setPose('idle');
      }, 0);
      return () => clearTimeout(idleTimer);
    }
    const timer = setTimeout(() => {
      walkOnceRef.current();
    }, rand(600, 1400));
    return () => {
      clearTimeout(timer);
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current);
      }
      clearFrameTimer();
      walkRef.current?.stop();
    };
  }, [paused, walkPoints.length]);

  if (walkPoints.length === 0) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: [{ translateX: x }, { translateY: y }],
      }}>
      <Animated.View
        style={{
          transform: [
            {
              translateY: bob.interpolate({
                inputRange: [0, 1],
                outputRange: [0, moving ? 0 : -2],
              }),
            },
          ],
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="가치고치 확대"
          accessibilityHint="탭하면 확대해서 쓰담쓰담할 수 있어요"
          onPress={() => onPress({ x: posRef.current.x, y: posRef.current.y })}
          style={{
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ alignItems: 'center' }}>
            <GrowthCreatureSprite
              level={growthStage.level}
              size={size}
              pose={pose}
              facing={facing}
            />
            <View
              style={{
                marginTop: 2,
                width: size * 0.55,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(26,21,32,0.18)',
              }}
            />
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
