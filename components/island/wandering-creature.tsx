import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { createSheetFrame, SheetSprite } from '@/components/island/sheet-sprite';
import { planRoute, type WalkGrid } from '@/components/island/walk-route';
import type { GrowthStage } from '@/constants/growth';
import {
  MOTION_RULES,
  MOTION_SEQ,
  MOTION_STAGES,
  type MotionSeqId,
  type MotionStage,
  type MotionStageId,
} from '@/constants/island-motion';
import { nearestWalkPoint } from '@/constants/island-terrain';
import { useResponsive } from '@/hooks/use-responsive';

export type WalkPoint = { x: number; y: number };

type WanderingCreatureProps = {
  growthStage: GrowthStage;
  /** 열린 섬 타일 위의 점들 — 섬 확장 시 늘어남 */
  walkPoints: WalkPoint[];
  paused?: boolean;
  walkGrid?: WalkGrid;
  onPress: (pos: { x: number; y: number }) => void;
};

type Planner = (from: WalkPoint, to: WalkPoint) => WalkPoint[] | null;

type Phase = 'rest' | 'move' | 'takeoff' | 'fly' | 'land';
type Facing = 1 | -1;

type Engine = {
  stageId: MotionStageId;
  phase: Phase;
  seqId: MotionSeqId;
  frame: number;
  elapsed: number;
  restLeft: number;
  target: WalkPoint | null;
  route: WalkPoint[];
  x: number;
  y: number;
  facing: Facing;
};

type Shown = { x: number; y: number; lift: number; facing: Facing };

const PICK_RETRIES = 4;
const PICK_MIN_GAP = 18;
const ARRIVE_MIN = 8;
const ON_LAND_RADIUS = 28;
const MAX_TICK_MS = 250;
const MAX_STEPS_PER_TICK = 64;

function stageIdFor(level: number): MotionStageId {
  if (level <= 1) {
    return 'egg';
  }
  if (level >= 4) {
    return 'adult';
  }
  return 'juvenile';
}

function stageSeqs(stageId: MotionStageId): MotionSeqId[] {
  const stage = MOTION_STAGES[stageId];
  const ids = [stage.rest, stage.move, stage.takeoff, stage.land].filter((id): id is MotionSeqId => id != null);
  return [...new Set(ids)];
}

function rand([min, max]: readonly [number, number]) {
  return min + Math.random() * Math.max(0, max - min);
}

function pickTarget(points: WalkPoint[], from: WalkPoint, plan?: Planner): WalkPoint[] | null {
  if (points.length === 0) {
    return null;
  }
  const routeTo = (point: WalkPoint) => (plan ? plan(from, point) : [point]);
  if (points.length === 1) {
    return routeTo(points[0]);
  }
  const fallback = points[Math.floor(Math.random() * points.length)];
  for (let i = 0; i < PICK_RETRIES; i += 1) {
    const candidate = points[Math.floor(Math.random() * points.length)];
    if (Math.hypot(candidate.x - from.x, candidate.y - from.y) > PICK_MIN_GAP) {
      const route = routeTo(candidate);
      if (route) {
        return route;
      }
    }
  }
  return routeTo(fallback);
}

function seqFor(stage: MotionStage, phase: Phase): MotionSeqId {
  if (phase === 'rest') {
    return stage.rest;
  }
  if (phase === 'takeoff') {
    return stage.takeoff ?? stage.move;
  }
  if (phase === 'land') {
    return stage.land ?? stage.move;
  }
  return stage.move;
}

function sumMotion(id: MotionSeqId) {
  return MOTION_SEQ[id].motion.reduce((sum, value) => sum + value, 0);
}

function enterPhase(engine: Engine, phase: Phase) {
  engine.phase = phase;
  engine.seqId = seqFor(MOTION_STAGES[engine.stageId], phase);
  engine.frame = 0;
  engine.elapsed = 0;
}

function startRest(engine: Engine, range: readonly [number, number]) {
  enterPhase(engine, 'rest');
  engine.restLeft = rand(range);
  engine.target = null;
  engine.route = [];
}

function aimAt(engine: Engine, target: WalkPoint) {
  engine.target = target;
  engine.facing = target.x >= engine.x ? 1 : -1;
}

function startTravel(engine: Engine, route: WalkPoint[]) {
  const stage = MOTION_STAGES[engine.stageId];
  aimAt(engine, route[0]);
  engine.route = route.slice(1);
  enterPhase(engine, stage.kind === 'flight' && stage.takeoff ? 'takeoff' : 'move');
}

function chooseNext(engine: Engine, points: WalkPoint[], plan?: Planner) {
  const route = pickTarget(points, engine, plan);
  const goal = route?.[route.length - 1];
  if (!route || !goal || Math.hypot(goal.x - engine.x, goal.y - engine.y) < ARRIVE_MIN) {
    startRest(engine, MOTION_RULES.restMs);
    return;
  }
  startTravel(engine, route);
}

function remaining(engine: Engine) {
  if (!engine.target) {
    return 0;
  }
  let total = Math.hypot(engine.target.x - engine.x, engine.target.y - engine.y);
  let from = engine.target;
  for (const point of engine.route) {
    total += Math.hypot(point.x - from.x, point.y - from.y);
    from = point;
  }
  return total;
}

function moveToward(engine: Engine, distance: number) {
  let left = distance;
  while (left > 0 && engine.target) {
    const target = engine.target;
    const gap = Math.hypot(target.x - engine.x, target.y - engine.y);
    if (gap > left) {
      engine.x += ((target.x - engine.x) / gap) * left;
      engine.y += ((target.y - engine.y) / gap) * left;
      return;
    }
    engine.x = target.x;
    engine.y = target.y;
    left -= gap;
    const next = engine.route.shift();
    if (!next) {
      return;
    }
    aimAt(engine, next);
  }
}

function advance(engine: Engine, dt: number, unit: number, points: WalkPoint[], paused: boolean, plan?: Planner) {
  let left = dt;
  for (let guard = 0; left > 0 && guard < MAX_STEPS_PER_TICK; guard += 1) {
    const seq = MOTION_SEQ[engine.seqId];
    const frameMs = seq.frameMs[engine.frame];
    const resting = engine.phase === 'rest';
    let step = Math.min(left, Math.max(0, frameMs - engine.elapsed));
    if (resting && !paused) {
      step = Math.min(step, Math.max(0, engine.restLeft));
    }
    if (!resting) {
      moveToward(engine, seq.motion[engine.frame] * unit * (step / frameMs));
    }
    engine.elapsed += step;
    left -= step;

    if (resting && !paused) {
      engine.restLeft -= step;
      if (engine.restLeft <= 0) {
        chooseNext(engine, points, plan);
        continue;
      }
    }
    if (engine.phase === 'move' && remaining(engine) === 0) {
      startRest(engine, MOTION_RULES.restMs);
      continue;
    }
    if (engine.elapsed < frameMs) {
      continue;
    }
    engine.elapsed = 0;
    if (engine.frame + 1 < seq.frameMs.length) {
      engine.frame += 1;
      continue;
    }
    const stage = MOTION_STAGES[engine.stageId];
    if (engine.phase === 'takeoff') {
      enterPhase(engine, 'fly');
    } else if (engine.phase === 'fly') {
      if (stage.land && remaining(engine) <= sumMotion(stage.land) * unit + 0.5) {
        enterPhase(engine, 'land');
      } else {
        engine.frame = 0;
      }
    } else if (engine.phase === 'land') {
      startRest(engine, MOTION_RULES.restMs);
    } else {
      engine.frame = 0;
    }
  }
}

function currentLift(engine: Engine, unit: number) {
  const seq = MOTION_SEQ[engine.seqId];
  const from = seq.lift[engine.frame];
  let to: number;
  if (engine.frame + 1 < seq.lift.length) {
    to = seq.lift[engine.frame + 1];
  } else {
    const stage = MOTION_STAGES[engine.stageId];
    const nextPhase: Phase = engine.phase === 'takeoff' || engine.phase === 'fly' ? 'fly' : engine.phase === 'land' ? 'rest' : engine.phase;
    to = MOTION_SEQ[seqFor(stage, nextPhase)].lift[0];
  }
  const t = Math.min(1, engine.elapsed / seq.frameMs[engine.frame]);
  return (from + (to - from) * t) * unit;
}

function createEngine(stageId: MotionStageId, start: WalkPoint): Engine {
  const engine: Engine = {
    stageId,
    phase: 'rest',
    seqId: MOTION_STAGES[stageId].rest,
    frame: 0,
    elapsed: 0,
    restLeft: 0,
    target: null,
    route: [],
    x: start.x,
    y: start.y,
    facing: 1,
  };
  startRest(engine, MOTION_RULES.firstRestMs);
  return engine;
}

export function WanderingCreature({ growthStage, walkPoints: rawPoints, paused, walkGrid, onPress }: WanderingCreatureProps) {
  const { scale } = useResponsive();
  const focused = useIsFocused();
  const size = scale(growthStage.level >= 4 ? 44 : growthStage.level >= 3 ? 40 : 36);
  const unit = size / MOTION_SEQ[MOTION_STAGES.egg.rest].artSize;
  const stageId = stageIdFor(growthStage.level);
  const footOffset = size / 2;
  const walkPoints = useMemo(() => {
    if (!walkGrid || walkGrid.cells.length === 0) {
      return rawPoints;
    }
    const cellPoints = walkGrid.cells.map((cell) => ({ x: (cell.col + 0.5) * walkGrid.cell, y: (cell.row + 0.5) * walkGrid.cell - footOffset }));
    const anchor = rawPoints[0];
    const first = anchor ? nearestWalkPoint(cellPoints, anchor) : null;
    return first ? [first, ...cellPoints.filter((point) => point !== first)] : cellPoints;
  }, [footOffset, rawPoints, walkGrid]);
  const start = walkPoints[0] ?? { x: 0, y: 0 };
  const [x] = useState(() => new Animated.Value(start.x));
  const [y] = useState(() => new Animated.Value(start.y));
  const [lift] = useState(() => new Animated.Value(0));
  const [sheetFrame] = useState(createSheetFrame);
  const [flip] = useState(() => new Animated.Value(1));
  const [seqId, setSeqId] = useState<MotionSeqId>(() => MOTION_STAGES[stageId].rest);
  const engineRef = useRef<Engine | null>(null);
  const shownRef = useRef<Shown | null>(null);
  const pointsRef = useRef(walkPoints);
  const pausedRef = useRef(Boolean(paused));
  const unitRef = useRef(unit);
  const stageIdRef = useRef(stageId);
  const planRef = useRef<Planner | undefined>(undefined);

  useEffect(() => {
    planRef.current = walkGrid ? (from, to) => planRoute(walkGrid, footOffset, from, to) : undefined;
  }, [footOffset, walkGrid]);

  useEffect(() => {
    unitRef.current = unit;
    stageIdRef.current = stageId;
  }, [stageId, unit]);

  useEffect(() => {
    pointsRef.current = walkPoints;
    if (walkPoints.length === 0) {
      return;
    }
    if (!engineRef.current) {
      engineRef.current = createEngine(stageIdRef.current, walkPoints[0]);
      x.setValue(walkPoints[0].x);
      y.setValue(walkPoints[0].y);
      return;
    }
    const engine = engineRef.current;
    const nearest = nearestWalkPoint(walkPoints, engine);
    if (!nearest) {
      return;
    }
    if (pausedRef.current) {
      engine.x = nearest.x;
      engine.y = nearest.y;
      startRest(engine, MOTION_RULES.restMs);
      x.setValue(nearest.x);
      y.setValue(nearest.y);
      return;
    }
    const onLand = walkPoints.some((point) => Math.hypot(point.x - engine.x, point.y - engine.y) < ON_LAND_RADIUS);
    if (!onLand) {
      startTravel(engine, planRef.current?.(engine, nearest) ?? [nearest]);
    }
  }, [walkPoints, x, y]);

  useEffect(() => {
    pausedRef.current = Boolean(paused);
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    startRest(engine, paused ? MOTION_RULES.restMs : MOTION_RULES.firstRestMs);
  }, [paused]);

  useEffect(() => {
    if (!focused) {
      return;
    }
    let raf = 0;
    let last: number | null = null;
    const loop = (now: number) => {
      const dt = last == null ? 0 : Math.min(MAX_TICK_MS, Math.max(0, now - last));
      last = now;
      const engine = engineRef.current;
      if (engine) {
        if (engine.stageId !== stageIdRef.current) {
          engine.stageId = stageIdRef.current;
          startRest(engine, MOTION_RULES.firstRestMs);
        }
        advance(engine, dt, unitRef.current, pointsRef.current, pausedRef.current, planRef.current);
        const cols = MOTION_SEQ[engine.seqId].sheet.cols;
        sheetFrame.set(engine.frame % cols, Math.floor(engine.frame / cols));
        const next: Shown = {
          x: engine.x,
          y: engine.y,
          lift: currentLift(engine, unitRef.current),
          facing: engine.facing,
        };
        const shown = shownRef.current;
        if (shown?.x !== next.x) {
          x.setValue(next.x);
        }
        if (shown?.y !== next.y) {
          y.setValue(next.y);
        }
        if (shown?.lift !== next.lift) {
          lift.setValue(next.lift);
        }
        if (shown?.facing !== next.facing) {
          flip.setValue(next.facing);
        }
        shownRef.current = next;
        const activeSeq = engine.seqId;
        setSeqId((current) => (current === activeSeq ? current : activeSeq));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [flip, focused, lift, sheetFrame, x, y]);

  if (walkPoints.length === 0) {
    return null;
  }

  const seqs = stageSeqs(stageId);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: [{ translateX: x }, { translateY: y }],
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="가치고치 확대"
        accessibilityHint="탭하면 확대해서 쓰담쓰담할 수 있어요"
        onPress={() => {
          const engine = engineRef.current;
          onPress({ x: engine?.x ?? start.x, y: engine?.y ?? start.y });
        }}
        style={{
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        }}>
        <View pointerEvents="none" style={{ width: size, height: size }}>
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transform: [{ scaleX: flip }] }}>
            {seqs.map((id) => {
              const sheet = MOTION_SEQ[id].sheet;
              return sheet.shadow ? (
                <SheetSprite
                  key={id}
                  source={sheet.shadow}
                  cols={sheet.cols}
                  rows={sheet.rows}
                  size={size}
                  frame={sheetFrame}
                  style={{ position: 'absolute', left: 0, top: 0, opacity: id === seqId ? 1 : 0 }}
                />
              ) : null;
            })}
          </Animated.View>
          <Animated.View
            style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transform: [{ translateY: lift }, { scaleX: flip }] }}>
            {seqs.map((id) => {
              const sheet = MOTION_SEQ[id].sheet;
              return (
                <SheetSprite
                  key={id}
                  source={sheet.body}
                  cols={sheet.cols}
                  rows={sheet.rows}
                  size={size}
                  frame={sheetFrame}
                  style={{ position: 'absolute', left: 0, top: 0, opacity: id === seqId ? 1 : 0 }}
                />
              );
            })}
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
