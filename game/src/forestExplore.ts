// 숲 탐험 재생기 — assets/scenes/forest-explore/ 의 재생표(track)대로 한 장씩 그림.
// 프레임워크와 무관(캔버스 2D ImageData 만 씀). Phaser 에선 CanvasTexture 에, RN 에선 캔버스/Skia 에 그대로 옮기면 됨.
// 그리기 규칙의 정답은 tools/forest-explore/bake.py 의 compose() — 이 파일은 그것을 그대로 옮긴 것(픽셀까지 같음, forest-explore.html?verify 로 검사).
// 자세한 설명: assets/scenes/forest-explore/README.md

type RGBA = Uint8ClampedArray;
interface Pix { w: number; h: number; d: RGBA }
type Shift = [number, number, number, number, number, number, 0 | 1];   // cx, cy, rx, ry, dx, dy, 방식(0 타원 전부 · 1 잎만)
export interface Rec {
  c: number; x: number; y: number;          // 그림 모음(kit) 몇 번 장 · 32칸 그림 왼쪽 위 (숲 좌표)
  s?: number; sy?: number;                  // 그림자 장 · 그림자 위 y
  w?: number;                               // 잎에 잠김: 잎 아치선 y = w + ARC[x % 16]
  u?: 1;                                    // 덤불 밑: 덤불 아랫선(underY + BUMP) 위는 가림
  sf?: Shift[];                             // 숲 흔들기 (순서대로)
  l?: [number, number, number][];           // 잎 [x, y, 모양]
  hx: number; hy: number;                   // 캐릭터 가운데 x · 머리 꼭대기 y (말풍선·물건 기준)
  q?: number; b?: number;                   // "?" 말풍선 장 · "!" 말풍선 장
  ih?: number; ia?: number;                 // 물건: 사라지는 중 경과 ms · 나타난 뒤 경과 ms
  f?: [string, number, number, number][];   // 폭죽 [종류 a|b|c, 장, dx, dy] (물건 가운데 또는 머리 위 8칸 기준)
}
export interface Track {
  scene: 'intro' | 'loop' | 'find' | 'leave'; tickMs: number; frames: number; kitCols: number; cell: number;
  canvas: { w: number; h: number; forestX: number; forestY: number }; underY: number;
  track: Rec[]; holdFromFrame?: number; travelFrames?: number; travelByHandoff?: Rec[][];
  handoffs?: { t: number; x: number; F: number }[]; item?: { appearAt?: number; hideMs?: number };
  entry?: { x: number; F: number }; exit?: { x: number; F: number };
}

// ── 숲 그림 규칙 (숲 그림 색 그대로)
const BROWN = ['4a4035', '6f604c', '5f5242', '86745a'], GRASS = ['5ca05b'];
const NOT_LEAF = new Set([...BROWN, ...GRASS].map(h => parseInt(h, 16)));
const ARC = [2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2];   // 덤불 윗머리 아치 (덤불 하나 16칸)
const BUMP = [0, 1, 2, 2, 2, 1, 0, 0, 1, 1];                    // 덤불 아랫단 물결
const hex = (h: string) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
const C_TOP = hex('86cc78'), C_HI = hex('a2d98a'), C_MID = hex('6dbf6a'), EDGE = hex('357f50');
const capColor = (row: number, i: number) => (row === 1 && i >= 5 && i <= 9) ? C_HI : (row <= 2 ? C_TOP : C_MID);
const mod = (a: number, n: number) => ((a % n) + n) % n;
const pyRound = (x: number) => { const f = Math.floor(x), d = x - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); };   // 파이썬 round (반올림 짝수)
const easeIn = (u: number) => u * u, easeOut = (u: number) => 1 - (1 - u) ** 2;

async function loadPix(url: string): Promise<Pix> {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, d: x.getImageData(0, 0, img.width, img.height).data };
}
function cut(p: Pix, i: number, fw: number, fh: number, cols = Infinity): Pix {
  const col = i % Math.min(cols, Math.floor(p.w / fw)), row = Math.floor(i / Math.min(cols, Math.floor(p.w / fw)));
  const d = new Uint8ClampedArray(fw * fh * 4);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const s = ((row * fh + y) * p.w + col * fw + x) * 4, t = (y * fw + x) * 4;
    d[t] = p.d[s]; d[t + 1] = p.d[s + 1]; d[t + 2] = p.d[s + 2]; d[t + 3] = p.d[s + 3];
  }
  return { w: fw, h: fh, d };
}
/** 칸 덮어 그리기 (투명 아닌 칸만) — mask 가 있으면 mask[i] 가 참인 칸만 */
function blit(dst: Pix, s: Pix, ox: number, oy: number, mask?: (i: number) => boolean) {
  for (let y = 0; y < s.h; y++) {
    const ty = oy + y; if (ty < 0 || ty >= dst.h) continue;
    for (let x = 0; x < s.w; x++) {
      const tx = ox + x; if (tx < 0 || tx >= dst.w) continue;
      const si = (y * s.w + x) * 4; if (s.d[si + 3] === 0) continue;
      const di = ty * dst.w + tx; if (mask && !mask(di)) continue;
      dst.d[di * 4] = s.d[si]; dst.d[di * 4 + 1] = s.d[si + 1]; dst.d[di * 4 + 2] = s.d[si + 2]; dst.d[di * 4 + 3] = s.d[si + 3];
    }
  }
}
const isLeaf = (d: RGBA, i: number) => d[i * 4 + 3] > 0 && !NOT_LEAF.has((d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2]);

export interface Assets {
  forest: Pix; kit: Pix; shadow: Pix; cols: number;
  question: Pix[]; bang: Pix[]; leaf: Pix[]; firework: Record<string, Pix[]>;
}
/** pkgUrl = 'scenes/forest-explore/' · animUrl = 'animations/' (assets/ 기준) */
export async function loadAssets(pkgUrl: string, animUrl: string, character: string): Promise<Assets> {
  const sheet = async (id: string, n: number, fw: number, fh: number) => { const p = await loadPix(animUrl + id + '/sheet.png'); return [...Array(n)].map((_, i) => cut(p, i, fw, fh)); };
  const [forest, kit, shadow] = await Promise.all([loadPix(pkgUrl + 'forest.png'), loadPix(`${pkgUrl}characters/${character}/kit.png`), loadPix(`${pkgUrl}characters/${character}/shadow.png`)]);
  return {
    forest, kit, shadow, cols: 16,
    question: await sheet('fx/question', 13, 16, 16), bang: await sheet('fx/panic-bang', 13, 16, 16), leaf: await sheet('fx/leaf', 3, 3, 2),
    firework: { a: await sheet('fx/firework-a', 7, 32, 32), b: await sheet('fx/firework-b', 7, 32, 32), c: await sheet('fx/firework-c', 7, 32, 32) },
  };
}

/** Vite 로 묶은 URL 로 에셋 로드 (fetch 경로 대신) */
export async function loadAssetsDirect(urls: {
  forest: string;
  kit: string;
  shadow: string;
  question: string;
  bang: string;
  leaf: string;
  fireworkA: string;
  fireworkB: string;
  fireworkC: string;
}): Promise<Assets> {
  const sheet = async (url: string, n: number, fw: number, fh: number) => {
    const p = await loadPix(url);
    return [...Array(n)].map((_, i) => cut(p, i, fw, fh));
  };
  const [forest, kit, shadow] = await Promise.all([loadPix(urls.forest), loadPix(urls.kit), loadPix(urls.shadow)]);
  return {
    forest,
    kit,
    shadow,
    cols: 16,
    question: await sheet(urls.question, 13, 16, 16),
    bang: await sheet(urls.bang, 13, 16, 16),
    leaf: await sheet(urls.leaf, 3, 3, 2),
    firework: {
      a: await sheet(urls.fireworkA, 7, 32, 32),
      b: await sheet(urls.fireworkB, 7, 32, 32),
      c: await sheet(urls.fireworkC, 7, 32, 32),
    },
  };
}
export async function loadTrack(pkgUrl: string, character: string, scene: string): Promise<Track> {
  return (await fetch(`${pkgUrl}characters/${character}/${scene}.json`)).json();
}
export async function loadItem(url: string): Promise<Pix> {          // 물건 그림 — 빈 테두리 잘라 냄 (32×32 이하)
  const p = await loadPix(url);
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.d[(y * p.w + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const o = { w: p.w, h: p.h, d: p.d }; const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 4; k++) d[(y * w + x) * 4 + k] = o.d[((y0 + y) * o.w + x0 + x) * 4 + k];
  return { w, h, d };
}

/** 재생표 한 장 → 그림 (canvas.w × canvas.h, 숲은 (forestX, forestY) 에) */
export function compose(rec: Rec, T: Track, A: Assets, item?: Pix | null): ImageData {
  const { w: CW, h: CH, forestX: OX, forestY: OY } = T.canvas;
  const FW = A.forest.w, FH = A.forest.h;
  // 1) 숲 흔들기
  let f: RGBA = A.forest.d.slice();
  for (const [cx, cy, rx, ry, dx, dy, mode] of rec.sf ?? []) {
    const src = new Uint8ClampedArray(f.length);
    for (let y = Math.max(0, dy); y < FH + Math.min(0, dy); y++) for (let x = Math.max(0, dx); x < FW + Math.min(0, dx); x++) {
      const t = (y * FW + x) * 4, s = ((y - dy) * FW + (x - dx)) * 4;
      src[t] = f[s]; src[t + 1] = f[s + 1]; src[t + 2] = f[s + 2]; src[t + 3] = f[s + 3];
    }
    const nf = f.slice();
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      const i = y * FW + x;
      if (mode === 1 && !(isLeaf(f, i) || (src[i * 4 + 3] > 0 && f[i * 4 + 3] === 0))) continue;
      nf[i * 4] = src[i * 4]; nf[i * 4 + 1] = src[i * 4 + 1]; nf[i * 4 + 2] = src[i * 4 + 2]; nf[i * 4 + 3] = src[i * 4 + 3];
    }
    f = nf;
  }
  const forest: Pix = { w: FW, h: FH, d: f };
  const img: Pix = { w: CW, h: CH, d: new Uint8ClampedArray(CW * CH * 4) };
  blit(img, forest, OX, OY);
  // 2) 그림자 · 캐릭터(따로 한 겹)
  if (rec.s !== undefined) blit(img, cut(A.shadow, rec.s, 32, 32, A.cols), OX + rec.x, OY + rec.sy!);
  const gl: Pix = { w: CW, h: CH, d: new Uint8ClampedArray(CW * CH * 4) };
  blit(gl, cut(A.kit, rec.c, 32, 32, A.cols), OX + rec.x, OY + rec.y);
  const fol = new Uint8Array(CW * CH);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (isLeaf(f, y * FW + x)) fol[(OY + y) * CW + OX + x] = 1;
  const op = (i: number) => gl.d[i * 4 + 3] > 0;
  let cap: [number, number, number[]][] | null = null;
  // 3) 숲 속: 잎 아치선 아래는 잎이 앞 (한 줄이 가려지면 그 아래도 다)
  if (rec.w !== undefined) {
    const line = new Int32Array(CW); for (let x = 0; x < CW; x++) line[x] = OY + rec.w + ARC[mod(x - OX, 16)];
    let cmin = CW, cmax = -1;
    const gone: number[] = [];
    for (let x = 0; x < CW; x++) {
      let hid = false;
      for (let y = 0; y < CH; y++) {
        const i = y * CW + x;
        if (y >= line[x] && fol[i]) hid = true;
        if (hid && op(i)) { gone.push(i); cmin = Math.min(cmin, x); cmax = Math.max(cmax, x); }
      }
    }
    for (const i of gone) gl.d[i * 4 + 3] = 0, gl.d[i * 4] = gl.d[i * 4 + 1] = gl.d[i * 4 + 2] = 0;
    if (cmax >= 0) {
      cap = [];
      for (let x = Math.max(cmin - 3, 0); x < Math.min(cmax + 4, CW); x++) for (let row = 0; row < 5; row++) {
        const y = line[x] + row;
        if (y >= 0 && y < CH && fol[y * CW + x]) cap.push([y, x, capColor(row, mod(x - OX, 16))]);
      }
    }
  }
  // 4) 덤불 밑: 덤불 아랫선 위는 덤불이 가림 + 진한 잎 테
  if (rec.u) {
    const gu = new Uint8Array(CW * CH);
    for (let x = 0; x < CW; x++) { const yb = OY + T.underY + BUMP[x % 10]; for (let y = 0; y <= Math.min(yb, CH - 1); y++) { const i = y * CW + x; if (op(i)) gu[i] = 1; } }
    for (let i = 0; i < gu.length; i++) if (gu[i]) gl.d[i * 4] = gl.d[i * 4 + 1] = gl.d[i * 4 + 2] = gl.d[i * 4 + 3] = 0;
    for (let y = 1; y < CH; y++) for (let x = 0; x < CW; x++) { const i = y * CW + x; if (gu[i - CW] && op(i)) gl.d.set(EDGE, i * 4); }
  }
  // 5) 잎 (보이는 캐릭터 칸 뒤로) → 캐릭터 → 덤불 윗머리 띠
  const vis = new Uint8Array(CW * CH); for (let i = 0; i < vis.length; i++) vis[i] = op(i) ? 1 : 0;
  const ll: Pix = { w: CW, h: CH, d: new Uint8ClampedArray(CW * CH * 4) };
  for (const [x, y, k] of rec.l ?? []) blit(ll, A.leaf[k], OX + x, OY + y);
  blit(img, ll, 0, 0, i => !vis[i]);
  blit(img, gl, 0, 0);
  if (cap) for (const [y, x, c] of cap) img.d.set(c, (y * CW + x) * 4);
  // 6) "?" 말풍선 · 물건 · 폭죽 · "!" 말풍선 (말풍선 기준점 = 아래 가운데 (8, 16))
  const hx = rec.hx, hy = rec.hy;
  if (rec.q !== undefined) blit(img, A.question[rec.q], OX + hx - 8, OY + hy + 2 - 16);
  let ic: [number, number] | null = null;
  const behind = (ix: number, iy: number) => {               // 물건을 캐릭터 뒤에
    const il: Pix = { w: CW, h: CH, d: new Uint8ClampedArray(CW * CH * 4) };
    blit(il, item!, ix, iy); blit(il, gl, 0, 0); blit(img, il, 0, 0);
  };
  if (item && rec.ih !== undefined) {
    const down = pyRound((item.h + 2) * easeIn(rec.ih / (T.item!.hideMs!)));
    behind(OX + hx - Math.floor(item.w / 2), OY + hy - 1 - item.h + down);
    ic = [hx, hy - 1 - Math.floor(item.h / 2)];
  }
  if (item && rec.ia !== undefined) {
    const r = rec.ia;
    const rise = r < 250 ? item.h + 1 - pyRound((item.h + 2) * easeOut(Math.min(1, r / 250))) : (r < 320 ? -1 : 0);
    const bob = r > 700 ? (Math.floor(r / 400) % 2 ? -1 : 0) : 0;
    const ix = OX + hx - Math.floor(item.w / 2), iy = OY + hy - 1 - item.h + rise + bob;
    if (r < 250) behind(ix, iy); else blit(img, item, ix, iy);
    ic = [hx, hy - 1 - Math.floor(item.h / 2)];
  }
  for (const [kind, idx, dx, dy] of rec.f ?? []) {
    const [cx, cy] = ic ?? [hx, hy - 8];
    blit(img, A.firework[kind][idx], OX + cx + dx - 16, OY + cy + dy - 16);
  }
  if (rec.b !== undefined) blit(img, A.bang[rec.b], OX + hx - 8, OY + hy + 2 - 16);
  return new ImageData(new Uint8ClampedArray(img.d), CW, CH);
}

/** 순서 재생기: 시작(intro 1회) → 반복(loop) → finish() 하면 다음 넘겨주기에서 찾기(find) → 마지막 자세 반복 → leave() 하면 떠나기 1회 → 'done' */
export class ForestExplore {
  phase: 'intro' | 'loop' | 'find' | 'leave' | 'done' = 'intro';
  frame = 0; private acc = 0; private wantFinish = false; private handoff = 1;
  onPhase?: (p: ForestExplore['phase']) => void;
  constructor(public A: Assets, public T: Record<'intro' | 'loop' | 'find' | 'leave', Track>, public item: Pix | null = null) {}
  static async load(pkgUrl: string, animUrl: string, character: string, itemUrl?: string) {
    const A = await loadAssets(pkgUrl, animUrl, character);
    const [intro, loop, find, leave] = await Promise.all(['intro', 'loop', 'find', 'leave'].map(s => loadTrack(pkgUrl, character, s)));
    return new ForestExplore(A, { intro, loop, find, leave }, itemUrl ? await loadItem(itemUrl) : null);
  }
  /** 탐험 시간이 끝났을 때 — 다음 넘겨주기(잠겨 안 보이는 순간)에서 찾기 장면으로 */
  finish() { this.wantFinish = true; }
  /** 보상 화면을 닫았을 때 — 떠나기 장면 1회 후 'done' (exit 자리에서 섬 걷기로 이어 가면 됨) */
  leave() { if (this.phase === 'find') this.go('leave'); }
  private go(p: ForestExplore['phase']) { this.phase = p; this.frame = 0; this.onPhase?.(p); }
  /** dtMs 만큼 시간을 보냄 (40ms 마다 한 장) */
  update(dtMs: number) {
    this.acc += dtMs;
    while (this.acc >= 40) { this.acc -= 40; this.step(); }
  }
  private step() {
    const t = this.T[this.phase as 'intro'];
    if (this.phase === 'done') return;
    if (this.phase === 'loop' && this.wantFinish) {
      const hs = this.T.loop.handoffs!;
      const k = hs.findIndex(h => Math.floor(h.t / 40) === this.frame);
      if (k >= 0) { this.handoff = k; this.wantFinish = false; this.go('find'); return; }
    }
    this.frame++;
    if (this.frame >= t.frames) {
      if (this.phase === 'intro') this.go('loop');
      else if (this.phase === 'loop') this.frame = 0;
      else if (this.phase === 'find') this.frame = t.holdFromFrame!;
      else if (this.phase === 'leave') { this.frame = t.frames - 1; this.go('done'); this.frame = this.T.leave.frames - 1; }
    }
  }
  /** 지금 장의 재생표 */
  current(): { rec: Rec; track: Track } {
    const ph = this.phase === 'done' ? 'leave' : this.phase;
    const t = this.T[ph]; const i = Math.min(this.frame, t.frames - 1);
    const rec = (ph === 'find' && i < t.travelFrames!) ? t.travelByHandoff![this.handoff][i] : t.track[i];
    return { rec, track: t };
  }
  draw(ctx: CanvasRenderingContext2D, x = 0, y = 0) {
    const { rec, track } = this.current();
    ctx.putImageData(compose(rec, track, this.A, (this.phase === 'find' || this.phase === 'leave' || this.phase === 'done') ? this.item : null), x, y);
  }
}
