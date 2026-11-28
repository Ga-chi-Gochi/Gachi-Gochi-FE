export type Anim = {
  id: string;
  label: string;
  playback: 'loop' | 'once' | 'timeline';
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  totalMs: number;
  sheet: string;
  shadow: string | null;
  durationsMs: number[];
  motionPx: number[];
  liftPx: number[];
  pivot?: [number, number];
  lifetimeMs?: number;
};

export class Player {
  f = 0;
  t = 0;
  done = false;

  constructor(
    public a: Anim,
    public loop = a.playback === 'loop',
  ) {}

  step(dt: number) {
    let moved = 0;
    while (dt > 0 && !this.done) {
      const ms = this.a.durationsMs[this.f];
      const use = Math.min(dt, ms - this.t);
      moved += ((this.a.motionPx[this.f] || 0) * use) / ms;
      this.t += use;
      dt -= use;
      if (this.t >= ms) {
        this.t = 0;
        if (this.f + 1 < this.a.frameCount) this.f++;
        else if (this.loop) this.f = 0;
        else {
          this.done = true;
          this.t = ms;
        }
      }
    }
    return moved;
  }

  lift() {
    const L = this.a.liftPx;
    const n = L.length;
    if (!L.some((v) => v)) return 0;
    const k = this.t / this.a.durationsMs[this.f];
    const nx = this.loop ? (this.f + 1) % n : Math.min(n - 1, this.f + 1);
    return L[this.f] + (L[nx] - L[this.f]) * (this.done ? 0 : k);
  }
}
