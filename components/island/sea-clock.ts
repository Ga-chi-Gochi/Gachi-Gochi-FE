import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';

import { createFoamFrame, type FoamFrame } from '@/components/island/foam-band';
import { createSheetFrame, type SheetFrame } from '@/components/island/sheet-sprite';
import { MOTION_SEQ } from '@/constants/island-motion';

export const WAVE_LAG_PER_COL = 2;
export const WAVE_COL_GROUP = 1;

const SEA = MOTION_SEQ['sea-deep'];
const SEA_COLS = SEA.sheet.cols;
const SEA_FRAMES = SEA.sheet.frameCount;

const FOAM_OFFSET = [0, 0, -2, -2, -4, -4, -6, -6, -6, -6, -6, -4, -4, -4, -2, -2, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const FOAM_OPACITY = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.35, 0.3, 0.3, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1, 1, 1, 1, 1,
];

const SPARKLE_ON_FRAMES = 3;

const lagFrames = new Map<number, SheetFrame>();
const foamFrames = new Map<number, FoamFrame>();
const sparkleFrames = new Map<number, FoamFrame>();

let frame = 0;
let users = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function wrap(value: number) {
  return ((value % SEA_FRAMES) + SEA_FRAMES) % SEA_FRAMES;
}

function show(target: SheetFrame, lag: number) {
  const shown = wrap(frame - lag);
  target.set(shown % SEA_COLS, Math.floor(shown / SEA_COLS));
}

function showFoam(target: FoamFrame, lag: number) {
  const shown = wrap(frame - lag);
  target.set(FOAM_OFFSET[shown], FOAM_OPACITY[shown]);
}

function showSparkle(target: FoamFrame, lag: number) {
  target.set(0, wrap(frame - lag) < SPARKLE_ON_FRAMES ? 1 : 0);
}

function tick() {
  frame = wrap(frame + 1);
  lagFrames.forEach((target, lag) => show(target, lag));
  foamFrames.forEach((target, lag) => showFoam(target, lag));
  sparkleFrames.forEach((target, lag) => showSparkle(target, lag));
  timer = setTimeout(tick, SEA.frameMs[frame]);
}

function retain() {
  users += 1;
  if (timer == null) {
    timer = setTimeout(tick, SEA.frameMs[frame]);
  }
}

function release() {
  users = Math.max(0, users - 1);
  if (users === 0 && timer != null) {
    clearTimeout(timer);
    timer = null;
    foamFrames.forEach((target) => target.set(0, 1));
    sparkleFrames.forEach((target) => target.set(0, 0));
  }
}

export function waveLag(col: number, centerCol: number) {
  const group = Math.max(1, WAVE_COL_GROUP);
  const distance = Math.abs(Math.floor(col / group) - Math.floor(centerCol / group)) * group;
  return wrap(Math.round(distance * WAVE_LAG_PER_COL));
}

export function seaFrameForLag(lag: number): SheetFrame {
  const key = wrap(lag);
  let target = lagFrames.get(key);
  if (!target) {
    target = createSheetFrame();
    show(target, key);
    lagFrames.set(key, target);
  }
  return target;
}

export function foamFrameForLag(lag: number): FoamFrame {
  const key = wrap(lag);
  let target = foamFrames.get(key);
  if (!target) {
    target = createFoamFrame();
    if (timer != null) {
      showFoam(target, key);
    }
    foamFrames.set(key, target);
  }
  return target;
}

export function sparkleFrameForLag(lag: number): FoamFrame {
  const key = wrap(lag);
  let target = sparkleFrames.get(key);
  if (!target) {
    target = createFoamFrame();
    showSparkle(target, timer != null ? key : frame + 1);
    sparkleFrames.set(key, target);
  }
  return target;
}

export function useSeaClock() {
  const focused = useIsFocused();

  useEffect(() => {
    if (!focused) {
      return;
    }
    retain();
    return release;
  }, [focused]);
}
