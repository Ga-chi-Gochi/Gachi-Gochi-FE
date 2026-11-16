import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';

import { createSheetFrame, type SheetFrame } from '@/components/island/sheet-sprite';
import { MOTION_SEQ } from '@/constants/island-motion';

export const WAVE_LAG_PER_COL = 2;
export const WAVE_COL_GROUP = 1;

const SEA = MOTION_SEQ['sea-deep'];
const SEA_COLS = SEA.sheet.cols;
const SEA_FRAMES = SEA.sheet.frameCount;

const lagFrames = new Map<number, SheetFrame>();

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

function tick() {
  frame = wrap(frame + 1);
  lagFrames.forEach((target, lag) => show(target, lag));
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
