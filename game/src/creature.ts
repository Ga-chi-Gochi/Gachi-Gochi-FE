// 귤새 모션 엔진. components/island/wandering-creature.tsx 의 순수 함수들을 그대로 옮겼다.
// 프레임마다 정해진 이동 거리(motion)·높이(lift)를 써서 발이 미끄러지지 않게 움직이고, 칸 단위 길찾기로 화산·물가를 피한다.
import { planRoute, type WalkGrid } from '@/components/island/walk-route';

import {
  MOTION_RULES,
  MOTION_SEQ,
  MOTION_STAGES,
  type MotionSeqId,
  type MotionStage,
  type MotionStageId,
} from './motion';

export { planRoute, type WalkGrid };

export type WalkPoint = { x: number; y: number };


export type Planner = (from: WalkPoint, to: WalkPoint) => WalkPoint[] | null;

type Phase = 'rest' | 'move' | 'takeoff' | 'fly' | 'land';
type Facing = 1 | -1;

export type Engine = {
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


const PICK_RETRIES = 4;
const PICK_MIN_GAP = 18;
const ARRIVE_MIN = 8;
export const ON_LAND_RADIUS = 28;
export const MAX_TICK_MS = 250;
const MAX_STEPS_PER_TICK = 64;

export function stageIdFor(level: number): MotionStageId {
  if (level <= 1) {
    return 'egg';
  }
  if (level >= 4) {
    return 'adult';
  }
  return 'juvenile';
}

export function stageSeqs(stageId: MotionStageId): MotionSeqId[] {
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

export function startRest(engine: Engine, range: readonly [number, number]) {
  enterPhase(engine, 'rest');
  engine.restLeft = rand(range);
  engine.target = null;
  engine.route = [];
}

function aimAt(engine: Engine, target: WalkPoint) {
  engine.target = target;
  engine.facing = target.x >= engine.x ? 1 : -1;
}

export function startTravel(engine: Engine, route: WalkPoint[]) {
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

export function advance(engine: Engine, dt: number, unit: number, points: WalkPoint[], paused: boolean, plan?: Planner) {
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

export function currentLift(engine: Engine, unit: number) {
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

export function createEngine(stageId: MotionStageId, start: WalkPoint): Engine {
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
