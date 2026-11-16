// 바다 시계. components/island/sea-clock.ts 와 같은 규칙:
// 바다·얕은 물·해안 시트는 모두 32프레임, 프레임마다 정해진 시간(110ms)으로 같이 넘어가고,
// 섬 가운데 칸에서 옆으로 한 칸 멀어질 때마다 2프레임씩 늦게 보인다 (너울).
import { MOTION_SEQ } from './motion';

export const WAVE_LAG_PER_COL = 2;
export const WAVE_COL_GROUP = 1;

const SEA = MOTION_SEQ['sea-deep'];
export const SEA_FRAMES = SEA.sheet.frameCount;

export const FOAM_OFFSET = [0, 0, -2, -2, -4, -4, -6, -6, -6, -6, -6, -4, -4, -4, -2, -2, -2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
export const FOAM_OPACITY = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.35, 0.3, 0.3, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1, 1, 1, 1, 1,
];
export const SPARKLE_ON_FRAMES = 3;

export function wrapFrame(value: number) {
  return ((value % SEA_FRAMES) + SEA_FRAMES) % SEA_FRAMES;
}

export function waveLag(col: number, centerCol: number) {
  const group = Math.max(1, WAVE_COL_GROUP);
  const distance = Math.abs(Math.floor(col / group) - Math.floor(centerCol / group)) * group;
  return wrapFrame(Math.round(distance * WAVE_LAG_PER_COL));
}

/** 프레임마다 시간이 정해진 시계. tick(dt) 하면 넘어간 만큼 프레임이 오른다 */
export class SeaClock {
  frame = 0;
  private left = SEA.frameMs[0];

  /** 프레임이 바뀌었으면 true */
  tick(dt: number) {
    let changed = false;
    this.left -= dt;
    for (let guard = 0; this.left <= 0 && guard < 64; guard += 1) {
      this.frame = wrapFrame(this.frame + 1);
      this.left += SEA.frameMs[this.frame];
      changed = true;
    }
    if (this.left <= 0) this.left = SEA.frameMs[this.frame];
    return changed;
  }

  shown(lag: number) {
    return wrapFrame(this.frame - lag);
  }
}
