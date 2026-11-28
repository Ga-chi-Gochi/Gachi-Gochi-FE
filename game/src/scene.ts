// 섬 화면 한 장. RN판(BeachHome · BeachPlay · IslandCamera · VolcanoGas)을 같은 좌표·같은 시간으로 옮겼다.
// 좌표 단위는 RN 화면 dp. 카메라 배율에 기기 픽셀 비율(dpr)을 곱해서, 1dp = 도트 1칸이 기기 픽셀 정수배로 그려지게 한다.
import Phaser from 'phaser';

import { toIslandStage, type IslandStageId } from '@/constants/island-stages';
import type { IslandZoneId } from '@/constants/island-zones';
import { ISLAND_ZONES, getIslandStage } from '@/constants/island-zones';
import { COLOR, PATTERNS } from '@/constants/pixel-patterns';
import { pixel } from '@/constants/pixel-theme';

import {
  ANIM_URLS,
  ANIMS,
  ASH,
  VOLCANO_ERUPT,
  VOLCANO_REST,
  anim,
  panicAttach,
  panicRun,
  panicStartle,
  type PanicFx,
  type PanicStage,
} from './anims';
import { embedded, listen, send, type GameState, type ToGame, type ZoneBoxes } from './bridge';
import {
  CELL,
  FOREST_FRAME,
  SEA_PLAIN_COLOR,
  SHORE_FOAM,
  SHORE_TUCK,
  SOFT_SHORE_SHEET,
  VOLCANO_SLOT_H,
  VOLCANO_SLOT_W,
  shoreCells,
  stageArt,
  volcanoSlot,
  zoneFrame,
} from './shape';
import { ForestExplore } from './forestExplore';
import {
  FOREST_EXPLORE_CANVAS,
  createForestExplore,
  forestExploreCharacter,
  forestExploreOrigin,
  forestUrl,
} from './forestExploreBundle';
import {
  MAX_TICK_MS,
  advance,
  createEngine,
  currentLift,
  stageIdFor,
  startRest,
  type Engine,
  type Planner,
} from './creature';
import { MOTION_RULES, MOTION_SEQ, type MotionStageId } from './motion';
import { Player } from './player';
import { SeaClock, waveLag } from './seaClock';
import { crossesVolcano, keepOnLand, settleOnLand, shiftEngine, walkSetup, type WalkSetup } from './walker';

import eggUrl from '../assets/island-v3/gyulsae-egg.png';
import youngUrl from '../assets/island-v3/gyulsae-young.png';
import adultUrl from '../assets/island-v3/gyulsae-adult.png';
import seaPlainUrl from '../assets/island-v3/sea-plain.png';
import stage1Url from '../assets/island-v3/stage1.png';
import stage2Url from '../assets/island-v3/stage2.png';
import stage3Url from '../assets/island-v3/stage3.png';
import seaShoreSoftUrl from '../assets/tiles-v2/sea-shore-soft.png';

/** 지수 님 모션 시트 (assets/motion/sheets 를 1/8 로 줄인 32px 칸). 키 = 파일 이름 */
const motionUrls = import.meta.glob('../assets/motion/*.png', { eager: true, import: 'default' }) as Record<string, string>;

const stageUrls: Record<IslandStageId, string> = { 1: stage1Url, 2: stage2Url, 3: stage3Url };

const shopUrls = import.meta.glob('../assets/shop/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const wearUrls = import.meta.glob('../assets/wear/*.png', { eager: true, import: 'default' }) as Record<string, string>;
type WearOffsetData = Record<string, [number, number][]> & {
  face?: Record<string, ([number, number] | null)[]>;
  hip?: Record<string, [number, number][]>;
};
const wearOffsetFiles = import.meta.glob('../assets/wear-offsets.json', { eager: true, import: 'default' }) as Record<string, WearOffsetData>;
const WEAR_OFFSETS: WearOffsetData = Object.values(wearOffsetFiles)[0] ?? {};
const FACE_OFFSETS = WEAR_OFFSETS.face ?? {};
const HIP_OFFSETS = WEAR_OFFSETS.hip ?? {};
const FACE_TRACK_ANIMS = new Set(Object.keys(FACE_OFFSETS));

// ------------------------------------------------------------------ 카메라 (island-camera.tsx)
const MIN_ZOOM = 0.62;
const MAX_ZOOM = 2.8;
const PAN_START = 12;
const HOME = { width: 390, height: 844, centerX: 204, centerY: 488, tile: 40, spanX: 340, spanY: 552 };

function clampPan(zoom: number, x: number, y: number, width: number, height: number) {
  const span = Math.abs(zoom - 1);
  const maxX = (span * width) / 2 + width * 0.1;
  const maxY = (span * height) / 2 + height * 0.1;
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

const DEFAULT_STATE: GameState = {
  zones: ['core'],
  growing: null,
  level: 3,
  factor: 1,
  placed: [],
  lastPlaced: null,
  placing: false,
  petOpen: false,
  locked: false,
  noticeEgg: false,
  explore: null,
};

const WEAR_STAGE: Record<MotionStageId, string> = { egg: 'egg', juvenile: 'young', adult: 'adult' };

const hexCache = new Map<string, number>();
/** '#RRGGBB' → 숫자. 용암처럼 매 프레임 쓰는 색은 한 번만 바꾼다 */
const hex = (color: string) => {
  let v = hexCache.get(color);
  if (v === undefined) {
    v = Phaser.Display.Color.HexStringToColor(color).color;
    hexCache.set(color, v);
  }
  return v;
};
const SWAP_WAIT_MS = 1500;
const PANIC_RADIUS = 2.2 * CELL;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

type AshSpan = { a: number; b: number; lo: boolean; hi: boolean; c: number; full: boolean };
type AshRun = [number, number, number, number];

const ASH_FULL = new Set([0, 32]);

const ashRuns = (spans: AshSpan[], edge: number, inner: (cs: number[]) => number) => {
  const out: AshRun[] = [];
  const sorted = [...spans].sort((p, q) => p.a - q.a);
  let cur: { b: number; ia: number; ib: number; cs: number[]; n: number; full: number } | null = null;
  const push = (r: NonNullable<typeof cur>) => {
    if (r.full > 0) out.push([r.ia, r.ib, r.full === r.n ? inner(r.cs) : edge, r.full / r.n]);
  };
  for (const sp of sorted) {
    const inset = (sp.b - sp.a) * 0.2;
    const ia = sp.lo ? -Infinity : sp.a + inset;
    const ib = sp.hi ? Infinity : sp.b - inset;
    if (cur && sp.a <= cur.b) {
      if (sp.b > cur.b) {
        cur.b = sp.b;
        cur.ib = ib;
      } else if (ib === Infinity) cur.ib = ib;
      if (ia === -Infinity) cur.ia = ia;
      if (sp.full) cur.cs.push(sp.c);
      cur.n += 1;
      cur.full += sp.full ? 1 : 0;
    } else {
      if (cur) push(cur);
      cur = { b: sp.b, ia, ib, cs: sp.full ? [sp.c] : [], n: 1, full: sp.full ? 1 : 0 };
    }
  }
  if (cur) push(cur);
  return out;
};

const ASH_RUNS = ASH.frames.map((items) => {
  const [bx0, by0, bx1, by1] = ASH.box;
  const top: AshSpan[] = [];
  const bottom: AshSpan[] = [];
  const left: AshSpan[] = [];
  const right: AshSpan[] = [];
  for (const [name, f, x, y] of items) {
    const full = ASH_FULL.has(f);
    const a = anim(name);
    const x1 = x + a.frameWidth;
    const y1 = y + a.frameHeight;
    const mx = x + a.frameWidth / 2;
    const my = y + a.frameHeight / 2;
    const l = x <= bx0;
    const r = x1 >= bx1;
    const t = y <= by0;
    const b = y1 >= by1;
    if (t) top.push({ a: x, b: x1, lo: l, hi: r, c: my, full });
    if (b) bottom.push({ a: x, b: x1, lo: l, hi: r, c: my, full });
    if (l) left.push({ a: y, b: y1, lo: t, hi: b, c: mx, full });
    if (r) right.push({ a: y, b: y1, lo: t, hi: b, c: mx, full });
  }
  return {
    top: ashRuns(top, by0, (cs) => Math.max(by0, Math.min(...cs))),
    bottom: ashRuns(bottom, by1, (cs) => Math.min(by1, Math.max(...cs))),
    left: ashRuns(left, bx0, (cs) => Math.max(bx0, Math.min(...cs))),
    right: ashRuns(right, bx1, (cs) => Math.min(bx1, Math.max(...cs))),
  };
});

type Point = { x: number; y: number };

type PanicActor = {
  stage: PanicStage;
  x: number;
  y: number;
  home: Point;
  facing: number;
  wantFacing: number;
  target: Point | null;
  retarget: number;
  sweatIn: number;
  bangIn: number;
  delay: number;
  mode: 'startle' | 'run';
  src: string;
  player: Player;
  fx: { k: PanicFx; pl: Player }[];
};

type Expand = {
  t: number;
  volcano: boolean;
  calm: boolean;
  fog: boolean;
  reveal: boolean;
  pending: boolean;
  held: number;
  swapped: boolean;
};

export class IslandScene extends Phaser.Scene {
  private dpr = 1;
  private W = 0;
  private H = 0;
  private state: GameState = DEFAULT_STATE;
  /** RN 이 첫 상태를 보내기 전에는 섬을 숨긴다 (기본값 섬이 잠깐 보였다 바뀌지 않게) */
  private gotState = false;

  private worldCam!: Phaser.Cameras.Scene2D.Camera;
  private fixedCam!: Phaser.Cameras.Scene2D.Camera;
  private world!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;

  private sea!: Phaser.GameObjects.Container;
  private seaClock = new SeaClock();
  private centerCol = 0;
  private stage: IslandStageId = 1;
  private water!: Phaser.GameObjects.Container;
  private rampBlocks: { img: Phaser.GameObjects.Image; lag: number }[] = [];
  private quake!: Phaser.GameObjects.Container;
  private terrain!: Phaser.GameObjects.Image;
  private forest!: Phaser.GameObjects.Container;
  private volcano!: Phaser.GameObjects.Sprite;
  private volcKey = VOLCANO_REST;
  private volcP = new Player(anim(VOLCANO_REST));
  private decor!: Phaser.GameObjects.Container;
  private creature!: Phaser.GameObjects.Container;
  private creatureBody!: Phaser.GameObjects.Image;
  private creatureShadow!: Phaser.GameObjects.Image;
  private wearBack!: Phaser.GameObjects.Container;
  private wearFront!: Phaser.GameObjects.Container;
  private wearKey = '';
  /** 온보딩: 알을 가리키는 픽셀 느낌표·반짝이 */
  private notice!: Phaser.GameObjects.Container;
  private noticeBang!: Phaser.GameObjects.Image;
  private noticeSparks: Phaser.GameObjects.Image[] = [];
  private explore!: Phaser.GameObjects.Container;
  private panicFx!: Phaser.GameObjects.Container;
  private ashLayer!: Phaser.GameObjects.Container;
  private ashSolid!: Phaser.GameObjects.Rectangle;
  private ashEdge!: Phaser.GameObjects.Graphics;
  private ashPool: Phaser.GameObjects.Sprite[] = [];

  private cam = { z: 1, x: 0, y: 0 };
  private camSentAt = 0;
  private camDirty = false;

  private terrainKey = '';
  private decorKey = '';

  private ex: Expand | null = null;
  private panic: PanicActor | null = null;

  // 귤새 (모션 엔진: creature.ts)
  private walk = {
    engine: null as Engine | null,
    points: [] as { x: number; y: number }[],
    pointsKey: '',
    plan: undefined as Planner | undefined,
    setup: null as WalkSetup | null,
    size: 36,
    shown: 32,
    unit: 36 / 32,
  };

  // 입력
  private gesture = {
    pinching: false,
    pinchDist: 1,
    pinchZoom: 1,
    panning: false,
    downX: 0,
    downY: 0,
    startX: 0,
    startY: 0,
    moved: false,
  };

  // 게임 FPS 보고
  private fps = { frames: 0, dur: 0, maxGap: 0, long: 0 };

  constructor() {
    super('island');
  }

  preload() {
    for (const [path, url] of Object.entries(motionUrls)) {
      const name = /([\w-]+)\.png$/.exec(path)?.[1];
      if (name) this.load.spritesheet(name, url, { frameWidth: 32, frameHeight: 32 });
    }
    for (const [path, url] of Object.entries(ANIM_URLS)) {
      const m = /anims\/([\w-]+)\/(sheet|shadow)\.png$/.exec(path);
      const a = m ? ANIMS[m[1]] : undefined;
      if (!m || !a) continue;
      this.load.spritesheet(m[2] === 'sheet' ? a.id : `${a.id}-shadow`, url, {
        frameWidth: a.frameWidth,
        frameHeight: a.frameHeight,
      });
    }
    this.load.spritesheet('tile-sea-shore-soft', seaShoreSoftUrl, { frameWidth: 32, frameHeight: 32 });
    this.load.image('v3-sea-plain', seaPlainUrl);
    for (const [id, url] of Object.entries(stageUrls)) this.load.image(`v3-stage${id}`, url);
    this.load.image('gyulsae-egg', eggUrl);
    this.load.image('gyulsae-young', youngUrl);
    this.load.image('gyulsae-adult', adultUrl);
    this.load.image('forest-bundle', forestUrl);
    for (const [path, url] of Object.entries(shopUrls)) {
      const m = /shop\/([\w-]+)\.png$/.exec(path);
      if (m) this.load.image(`shop-${m[1]}`, url);
    }
    for (const [path, url] of Object.entries(wearUrls)) {
      const m = /wear\/([\w-]+)\.png$/.exec(path);
      if (m) this.load.image(`wear-${m[1]}`, url);
    }
  }

  create() {
    this.dpr = this.registry.get('dpr') ?? 1;
    this.W = this.scale.width / this.dpr;
    this.H = this.scale.height / this.dpr;

    this.makeDotTextures();
    if (this.textures.exists('forest-bundle')) {
      this.textures.get('forest-bundle').setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // 층: 섬 세계(바다 포함, 확대·이동) → 화산재(화면 고정)
    // 바다도 섬과 같은 세계에 둔다. 끌거나 확대하면 바다와 섬이 한 화면처럼 같이 움직인다.
    this.world = this.add.container(0, 0);
    this.overlay = this.add.container(0, 0);

    this.sea = this.add.container(0, 0);
    this.layoutSea();

    this.quake = this.add.container(0, 0);
    // 얕은 물(3단계 색 블록·디더링 점·반짝이)과 남쪽 해안 파도 띠. 땅 아래에 깔리고 땅과 같이 흔들린다
    this.water = this.add.container(0, 0);
    this.terrain = this.add.image(0, 0, '__DEFAULT').setOrigin(0).setVisible(false);
    this.forest = this.add.container(0, 0);
    this.volcano = this.add.sprite(0, 0, VOLCANO_REST, 0).setOrigin(0, 1);
    this.quake.add([this.terrain, this.water, this.forest, this.volcano]);

    this.decor = this.add.container(0, 0);
    this.creature = this.add.container(0, 0);
    this.creatureShadow = this.add.image(0, 0, 'juvenile-idle-shadow', 0);
    this.creatureBody = this.add.image(0, 0, 'juvenile-idle', 0);
    this.wearBack = this.add.container(0, 0);
    this.wearFront = this.add.container(0, 0);
    this.creature.add([this.creatureShadow, this.wearBack, this.creatureBody, this.wearFront]);
    this.creature.setVisible(false);
    this.buildNoticeMarks();
    this.explore = this.add.container(0, 0).setVisible(false);
    this.panicFx = this.add.container(0, 0);
    this.ashSolid = this.add.rectangle(0, 0, 1, 1, hex(ASH.solid.color)).setOrigin(0).setVisible(false);
    this.ashEdge = this.add.graphics().setVisible(false);
    this.ashLayer = this.add.container(0, 0, [this.ashSolid, this.ashEdge]);
    // 깊은 바다는 흔들림(quake) 밖에 둔다. 원래도 깊은 바다는 안 흔들렸다.
    this.world.add([this.sea, this.quake, this.decor, this.creature, this.panicFx, this.notice, this.explore, this.ashLayer]);

    // 카메라: main = 배경색만(고정), worldCam = 바다+섬(확대·이동), fixedCam = 화산재(고정)
    const main = this.cameras.main;
    main.setBackgroundColor(SEA_PLAIN_COLOR);
    this.worldCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.fixedCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    main.ignore([this.world, this.overlay]);
    this.worldCam.ignore([this.overlay]);
    this.fixedCam.ignore([this.world]);
    for (const c of [main, this.worldCam, this.fixedCam]) c.setRoundPixels(false);
    this.applyFixedCams();
    this.applyCamera(true);

    this.setupInput();
    this.scale.on('resize', () => this.onResize());

    listen((msg) => this.onMessage(msg));
    this.world.setVisible(!embedded);
    this.applyState(this.state, true);
    send({ type: 'ready' });

    (window as unknown as { __island?: IslandScene }).__island = this;
  }

  /**
   * 깊은 바다를 화면보다 넓게 깐다. 가장 작게 축소(0.62)하고 끝까지 끌어도 빈 곳이 안 보이게
   * 화면 크기의 -1.2배 ~ +2.2배를 덮는다. 바다는 섬과 같은 세계에 있어서 끌거나 확대하면 같이 움직인다.
   * 칸마다 시간차(waveLag)가 다르고 세로로는 같으므로, 한 줄을 캔버스에 그려 세로로 반복해 깐다.
   */
  private layoutSea() {
    const art = stageArt(this.stage);
    this.centerCol = Math.floor(art.cols / 2);
    const reach = Math.ceil((3 * Math.max(this.W, this.H)) / (this.baseDp() * MIN_ZOOM) / CELL) * CELL;
    const x0 = Math.floor((art.width / 2 - reach) / CELL) * CELL;
    const y0 = Math.floor((art.height / 2 - reach) / CELL) * CELL;
    const x1 = Math.ceil((art.width / 2 + reach) / CELL) * CELL;
    const y1 = Math.ceil((art.height / 2 + reach) / CELL) * CELL;
    this.sea.removeAll(true);
    this.sea.add(this.add.tileSprite(x0, y0, x1 - x0, y1 - y0, 'v3-sea-plain').setOrigin(0));
  }

  private stepWater() {
    for (const b of this.rampBlocks) b.img.setFrame(this.seaClock.shown(b.lag));
  }

  // ------------------------------------------------------------------ 텍스처
  private makeDotTextures() {
    for (const [id, rows] of Object.entries(PATTERNS)) {
      const cols = Math.max(...rows.map((r) => r.length));
      const tex = this.textures.createCanvas(`dot-${id}`, cols, rows.length);
      if (!tex) continue;
      const ctx = tex.getContext();
      rows.forEach((row, y) => {
        row.split('').forEach((ch, x) => {
          if (ch === '.') return;
          ctx.fillStyle = COLOR[ch] ?? pixel.ink;
          ctx.fillRect(x, y, 1, 1);
        });
      });
      tex.refresh();
    }
  }

  // ------------------------------------------------------------------ 카메라
  private applyFixedCams() {
    for (const c of [this.cameras.main, this.fixedCam]) {
      c.setSize(this.scale.width, this.scale.height);
      c.setZoom(this.dpr);
      c.centerOn(this.W / 2, this.H / 2);
    }
    this.worldCam.setSize(this.scale.width, this.scale.height);
  }

  private baseDp() {
    const art = stageArt(this.stage);
    const fx = this.W / HOME.width;
    const fy = this.H / HOME.height;
    const tile = Math.min(HOME.tile * Math.min(fx, fy), (HOME.spanX * fx) / art.cols, (HOME.spanY * fy) / art.rows);
    return tile / CELL;
  }

  private viewZoom() {
    return Math.max(1, Math.round(this.dpr * this.baseDp() * this.cam.z * CELL)) / CELL;
  }

  private ashOffset() {
    const slot = volcanoSlot(this.stage);
    return { x: slot.x - ASH.origin[0] * CELL, y: slot.y - ASH.origin[1] * CELL };
  }

  private shownZoom() {
    return this.viewZoom() / this.dpr;
  }

  private viewCenter() {
    const art = stageArt(this.stage);
    const zd = this.shownZoom();
    const sx0 = (this.W * HOME.centerX) / HOME.width;
    const sy0 = (this.H * HOME.centerY) / HOME.height;
    return {
      cx: art.width / 2 + (this.W / 2 - sx0 - this.cam.x) / zd,
      cy: art.height / 2 + (this.H / 2 - sy0 - this.cam.y) / zd,
    };
  }

  private snap(v: number) {
    const z = this.worldCam.zoom;
    return Math.round(v * z) / z;
  }

  private applyCamera(force = false) {
    const { cx, cy } = this.viewCenter();
    const Z = this.viewZoom();
    const Wd = this.scale.width;
    const Hd = this.scale.height;
    const qx = Math.round(cx * Z - Wd / 2);
    const qy = Math.round(cy * Z - Hd / 2);
    this.worldCam.setZoom(Z);
    this.worldCam.setScroll((qx + Wd / 2) / Z - Wd / 2, (qy + Hd / 2) / Z - Hd / 2);
    this.camDirty = true;
    if (force) this.flushCamera(true);
  }

  private flushCamera(force = false) {
    const now = this.time.now;
    if (!this.camDirty || (!force && now - this.camSentAt < 60)) return;
    this.camDirty = false;
    this.camSentAt = now;
    const zd = this.shownZoom();
    const { cx, cy } = this.viewCenter();
    send({
      type: 'camera',
      zoom: zd,
      x: (this.W / 2 - cx) * zd,
      y: (this.H / 2 - cy) * zd,
      w: this.W,
      h: this.H,
      zones: this.zoneBoxes(),
    });
  }

  private zoneBoxes(): ZoneBoxes {
    const boxes: ZoneBoxes = {};
    for (const zone of ISLAND_ZONES) boxes[zone.id] = zoneFrame(this.stage, zone.id);
    return boxes;
  }

  private onResize() {
    const W = this.scale.width / this.dpr;
    const H = this.scale.height / this.dpr;
    if (Math.abs(W - this.W) < 0.5 && Math.abs(H - this.H) < 0.5) return;
    this.W = W;
    this.H = H;
    this.layoutSea();
    this.applyFixedCams();
    this.applyCamera(true);
    this.flushCamera(true);
    this.terrainKey = '';
    this.decorKey = '';
    this.walk.pointsKey = '';
    this.applyState(this.state, true);
  }

  // ------------------------------------------------------------------ 입력 (핀치·이동·탭)
  private inputBlocked() {
    return Boolean(this.ex);
  }

  private setupInput() {
    this.input.addPointer(2);
    const g = this.gesture;
    const active = () => this.input.manager.pointers.filter((p) => p.isDown);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const downs = active();
      if (downs.length >= 2) {
        const [a, b] = downs;
        g.pinching = true;
        g.panning = false;
        g.moved = true;
        g.pinchDist = Math.max(1, Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y));
        g.pinchZoom = this.cam.z;
        return;
      }
      g.downX = p.x;
      g.downY = p.y;
      g.startX = this.cam.x;
      g.startY = this.cam.y;
      g.panning = false;
      g.moved = false;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const downs = active();
      if (downs.length >= 2 && g.pinching) {
        if (this.state.locked || this.inputBlocked()) return;
        const [a, b] = downs;
        const dist = Math.max(1, Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y));
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (g.pinchZoom * dist) / g.pinchDist));
        const c = clampPan(next, this.cam.x, this.cam.y, this.W, this.H);
        this.cam = { z: next, x: c.x, y: c.y };
        this.applyCamera();
        return;
      }
      if (g.pinching) return;
      const dx = (p.x - g.downX) / this.dpr;
      const dy = (p.y - g.downY) / this.dpr;
      if (!g.panning && Math.hypot(dx, dy) >= PAN_START) {
        g.panning = true;
        g.moved = true;
      }
      if (!g.panning || this.state.locked || this.inputBlocked()) return;
      const c = clampPan(this.cam.z, g.startX + dx, g.startY + dy, this.W, this.H);
      this.cam = { z: this.cam.z, x: c.x, y: c.y };
      this.applyCamera();
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const left = active().length;
      if (g.pinching) {
        if (left === 0) g.pinching = false;
        return;
      }
      if (!g.moved && !this.inputBlocked()) this.onTap(p);
      g.panning = false;
    });

    // 웹: 마우스 휠로 확대 (island-camera.tsx 웹 처리와 같다)
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.state.locked || this.inputBlocked()) return;
      const dir = dy > 0 ? -1 : 1;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.cam.z + dir * 0.08));
      const c = clampPan(next, this.cam.x, this.cam.y, this.W, this.H);
      this.cam = { z: next, x: c.x, y: c.y };
      this.applyCamera();
    });
  }

  private onTap(p: Phaser.Input.Pointer) {
    const w = this.worldCam.getWorldPoint(p.x, p.y);
    const slot = volcanoSlot(this.stage);
    if (
      !this.state.locked &&
      w.x >= slot.x &&
      w.x < slot.x + VOLCANO_SLOT_W &&
      w.y >= slot.y &&
      w.y < slot.y + VOLCANO_SLOT_H
    ) {
      this.eruptVolcano();
      return;
    }
    if (!this.creature.visible) return;
    const half = this.walk.size / 2;
    const cx = this.walk.engine?.x ?? this.creature.x;
    const cy = this.walk.engine?.y ?? this.creature.y;
    if (Math.abs(w.x - cx) <= half && Math.abs(w.y - cy) <= half) {
      send({ type: 'tapCreature' });
    }
  }

  // ------------------------------------------------------------------ RN 메시지
  private onMessage(msg: ToGame) {
    if (msg.type === 'state') {
      const { type: _type, ...next } = msg;
      if (!this.gotState) {
        // 기본값으로 만든 귤새를 버리고 진짜 첫 상태의 첫 점에서 시작한다 (RN 처럼)
        this.walk.engine = null;
        this.walk.pointsKey = '';
      }
      this.applyState(next);
      if (!this.gotState) {
        this.gotState = true;
        this.world.setVisible(true);
      }
    } else if (msg.type === 'erupt') {
      this.startExpand();
    } else if (msg.type === 'camera-reset') {
      this.cam = { z: 1, x: 0, y: 0 };
      this.applyCamera(true);
    }
  }

  private openZones(state: GameState) {
    const ids = new Set<IslandZoneId>(state.zones);
    if (state.growing) ids.add(state.growing);
    return [...ids];
  }

  private applyState(next: GameState, force = false) {
    this.state = next;
    const hold = Boolean(this.ex && !this.ex.swapped);
    const tKey = JSON.stringify([this.W, this.H, next.zones, next.growing]);
    if (hold && this.ex && tKey !== this.terrainKey) this.ex.pending = true;
    if (!hold && (force || tKey !== this.terrainKey)) {
      this.terrainKey = tKey;
      this.buildTerrain();
    }
    const dKey = JSON.stringify([this.W, this.H, next.placed, next.lastPlaced, next.zones, next.growing, next.factor]);
    if (!hold && (force || dKey !== this.decorKey)) {
      this.decorKey = dKey;
      this.buildDecor();
    }
    this.updateWalkers();
    this.updateExplore();
    this.syncWear();
  }

  private syncWear() {
    const stage = WEAR_STAGE[stageIdFor(this.state.level)];
    const wear = this.state.wear ?? { back: [], front: [] };
    const key = JSON.stringify([stage, wear.back, wear.front]);
    if (key === this.wearKey) return;
    this.wearKey = key;
    const fill = (layer: Phaser.GameObjects.Container, items: string[]) => {
      layer.removeAll(true);
      for (const item of items) {
        if (stage === 'egg' && item === wear.face) continue;
        const tex = `wear-${item}-${stage}`;
        if (this.textures.exists(tex)) layer.add(this.add.image(0, 0, tex).setName(item));
      }
    };
    fill(this.wearBack, wear.back);
    fill(this.wearFront, wear.front);
  }

  private poseWear(flip: boolean, animId: string, frame: number) {
    const size = this.walk.shown;
    const unit = size / CELL;
    const [dx, dy] = WEAR_OFFSETS[animId]?.[frame] ?? [0, 0];
    const face = this.state.wear?.face;
    const seat = this.state.wear?.seat;
    const track = FACE_TRACK_ANIMS.has(animId);
    const faceAt = track ? (FACE_OFFSETS[animId]?.[frame] ?? null) : null;
    const hipAt = HIP_OFFSETS[animId]?.[frame] ?? [0, 0];
    for (const layer of [this.wearBack, this.wearFront]) {
      layer.x = (flip ? -dx : dx) * unit;
      layer.y = this.creatureBody.y + dy * unit;
      for (const img of layer.list as Phaser.GameObjects.Image[]) {
        img.setDisplaySize(size, size).setFlipX(flip);
        let at: [number, number] = [dx, dy];
        if (seat != null && img.name === seat) {
          at = hipAt;
        } else if (face != null && img.name === face && track) {
          if (!faceAt) {
            img.setVisible(false);
            continue;
          }
          at = faceAt;
        }
        img.setPosition((flip ? dx - at[0] : at[0] - dx) * unit, (at[1] - dy) * unit).setVisible(true);
      }
    }
  }
  // ------------------------------------------------------------------ 섬 땅 (BeachHome)
  private buildTerrain() {
    const next = toIslandStage(getIslandStage(this.state.zones));
    if (next !== this.stage) {
      const [ax0, ay0] = stageArt(this.stage).volcanoAnchor;
      const [ax1, ay1] = stageArt(next).volcanoAnchor;
      if (this.walk.engine) shiftEngine(this.walk.engine, ax1 - ax0, ay1 - ay0);
      this.stage = next;
      this.cam = { z: 1, x: 0, y: 0 };
      this.layoutSea();
      this.applyCamera(true);
    }
    this.terrain.setTexture(`v3-stage${this.stage}`).setPosition(0, 0).setVisible(true);
    this.buildShore();
    this.placeForest();
    this.placeVolcano();
  }

  private placeForest() {
    this.forest.removeAll(true);
    // 탐험 중엔 ForestExplore 판이 숲을 그리므로 정적 숲은 숨긴다
    this.forest.setVisible(this.stage === 3 && !this.state.explore);
    if (this.stage !== 3) return;
    if (!this.textures.exists('forest-bundle')) return;
    const f = FOREST_FRAME;
    this.forest.add(
      this.add.image(f.x, f.y, 'forest-bundle').setOrigin(0).setDisplaySize(f.w, f.h).setName('forest-bundle'),
    );
  }

  private placeVolcano() {
    const slot = volcanoSlot(this.stage);
    this.volcano.setPosition(slot.x, slot.y + VOLCANO_SLOT_H);
  }

  private buildShore() {
    this.tweens.killTweensOf(this.water.list);
    this.water.removeAll(true);
    this.rampBlocks = [];
    if (!SHORE_FOAM) return;
    const shoreKey = SOFT_SHORE_SHEET.body as unknown as string;
    for (const cell of shoreCells(this.stage)) {
      const lag = waveLag(cell.col, this.centerCol);
      const img = this.add.image(cell.col * CELL, cell.row * CELL - SHORE_TUCK, shoreKey, this.seaClock.shown(lag)).setOrigin(0);
      this.rampBlocks.push({ img, lag });
      this.water.add(img);
    }
    this.stepWater();
  }

  private setVolcano(key: string, loop: boolean) {
    this.volcKey = key;
    this.volcP = new Player(anim(key), loop);
    this.volcano.setTexture(key, 0);
  }

  private eruptVolcano() {
    if (this.ex || this.volcKey !== VOLCANO_REST) return;
    this.setVolcano(VOLCANO_ERUPT, false);
  }

  private stepVolcano(dt: number) {
    this.volcP.step(dt);
    if (this.volcP.done && !this.ex) this.setVolcano(VOLCANO_REST, true);
    this.volcano.setFrame(this.volcP.f);
  }

  private startExpand() {
    if (this.ex) return;
    this.ex = { t: 0, volcano: false, calm: false, fog: false, reveal: false, pending: false, held: 0, swapped: false };
    this.startPanic();
    this.stepExpand(0);
  }

  private stepExpand(dt: number) {
    const ex = this.ex;
    if (!ex) return;
    const P = ASH.phases;
    ex.t += dt;
    if (!ex.volcano && ex.t >= ASH.volcano_start_ms) {
      ex.volcano = true;
      this.setVolcano(ASH.volcano, false);
    }
    if (!ex.calm && ex.t >= P.erupt) {
      ex.calm = true;
      send({ type: 'calm' });
    }
    if (!ex.fog && ex.t >= P.cover) {
      ex.fog = true;
      send({ type: 'fog' });
    }
    if (!ex.reveal && ex.t >= P.covered) {
      ex.reveal = true;
      send({ type: 'reveal' });
    }
    if (!ex.swapped && ex.t >= ASH.swap_ms) {
      if (!ex.pending && ex.held < SWAP_WAIT_MS) {
        ex.held += dt;
        ex.t = ASH.swap_ms;
      } else {
        ex.swapped = true;
        this.stopPanic();
        this.applyState(this.state);
        this.applyCamera(true);
      }
    }
    if (ex.t >= P.done) {
      this.ex = null;
      for (const s of this.ashPool) s.setVisible(false);
      this.ashSolid.setVisible(false);
      this.ashEdge.clear().setVisible(false);
      this.sendAsh(this.time.now, 0, true);
      this.applyCamera(true);
      send({ type: 'done' });
      return;
    }
    this.drawAsh(ex.t);
    this.sendAsh(this.time.now, this.ashLevel(ex.t));
  }

  private drawAsh(t: number) {
    let acc = 0;
    let i = ASH.ms.length - 1;
    for (let k = 0; k < ASH.ms.length; k += 1) {
      acc += ASH.ms[k];
      if (t < acc) {
        i = k;
        break;
      }
    }
    const o = this.ashOffset();
    const items = ASH.frames[i] ?? [];
    while (this.ashPool.length < items.length) {
      const s = this.add.sprite(0, 0, items[0][0]).setOrigin(0).setVisible(false);
      this.ashPool.push(s);
      this.ashLayer.add(s);
    }
    items.forEach(([name, f, x, y], k) => {
      const s = this.ashPool[k];
      if (s.texture.key !== name) s.setTexture(name);
      s.setFrame(f).setPosition(this.snap(o.x + x), this.snap(o.y + y)).setVisible(true);
    });
    for (let k = items.length; k < this.ashPool.length; k += 1) this.ashPool[k].setVisible(false);
    const z = this.worldCam.zoom;
    const vw = this.scale.width / z;
    const vh = this.scale.height / z;
    const { cx, cy } = this.viewCenter();
    const vx0 = cx - vw / 2 - CELL;
    const vy0 = cy - vh / 2 - CELL;
    const vx1 = cx + vw / 2 + CELL;
    const vy1 = cy + vh / 2 + CELL;
    const solid = t >= ASH.solid.from_ms && t < ASH.solid.to_ms;
    this.ashSolid.setVisible(solid);
    if (solid) this.ashSolid.setPosition(vx0, vy0).setSize(vx1 - vx0, vy1 - vy0);
    const g = this.ashEdge.clear().setVisible(!solid);
    if (!solid) {
      const color = hex(ASH.solid.color);
      const runs = ASH_RUNS[i];
      const cx = (v: number) => Math.min(vx1, Math.max(vx0, o.x + v));
      const cy = (v: number) => Math.min(vy1, Math.max(vy0, o.y + v));
      for (const [a, b, d, k] of runs.top) {
        if (b > a) g.fillStyle(color, k).fillRect(cx(a), vy0, cx(b) - cx(a), o.y + d - vy0);
      }
      for (const [a, b, d, k] of runs.bottom) {
        if (b > a) g.fillStyle(color, k).fillRect(cx(a), o.y + d, cx(b) - cx(a), vy1 - o.y - d);
      }
      for (const [a, b, d, k] of runs.left) {
        if (b > a) g.fillStyle(color, k).fillRect(vx0, cy(a), o.x + d - vx0, cy(b) - cy(a));
      }
      for (const [a, b, d, k] of runs.right) {
        if (b > a) g.fillStyle(color, k).fillRect(o.x + d, cy(a), vx1 - o.x - d, cy(b) - cy(a));
      }
    }
  }

  private ashLevel(t: number) {
    const P = ASH.phases;
    if (t < P.cover) return 0;
    if (t < P.covered) return (t - P.cover) / (P.covered - P.cover);
    if (t < P.clear) return 1;
    return Math.max(0, 1 - (t - P.clear) / (P.done - P.clear));
  }

  private ashSentAt = 0;

  /** 화면 몇 곳의 화산재 진하기(0~1). RN 버튼·상단 바가 구름에 덮이는 것처럼 흐려지게 쓴다 */
  private sendAsh(now: number, level: number, force = false) {
    if (!force && now - this.ashSentAt < 50) return;
    this.ashSentAt = now;
    const v = Math.round(level * 20) / 20;
    const block = this.ex ? this.ex.t >= ASH.phases.cover : false;
    send({ type: 'ash', top: v, mid: v, bottom: v, block });
  }

  private startPanic() {
    const engine = this.walk.engine;
    this.panic = null;
    if (!engine || !this.creature.visible) return;
    const stage = engine.stageId as PanicStage;
    this.panic = {
      stage,
      x: engine.x,
      y: engine.y,
      home: { x: engine.x, y: engine.y },
      facing: Math.random() < 0.5 ? -1 : 1,
      wantFacing: 0,
      target: null,
      retarget: 0,
      sweatIn: rand(350, 700),
      bangIn: 130,
      delay: rand(0, 160),
      mode: 'startle',
      src: panicStartle(stage),
      player: new Player(anim(panicStartle(stage)), false),
      fx: [],
    };
  }

  private stopPanic() {
    if (!this.panic) return;
    this.panic = null;
    for (const s of this.panicFx.list) (s as Phaser.GameObjects.Sprite).setVisible(false);
    this.walk.engine = null;
    this.walk.pointsKey = '';
  }

  private panicTarget(p: PanicActor): Point {
    const cells = this.walk.setup?.cells ?? [];
    const near = cells
      .map((c) => ({ x: (c.col + 0.5) * CELL, y: (c.row + 0.5) * CELL }))
      .filter((q) => Math.hypot(q.x - p.home.x, q.y - p.home.y) <= PANIC_RADIUS);
    for (let k = 0; k < 12; k += 1) {
      if (near.length === 0) break;
      const q = near[Math.floor(Math.random() * near.length)];
      const x = q.x + rand(-0.3, 0.3) * CELL;
      const y = q.y + rand(-0.3, 0.3) * CELL;
      if (crossesVolcano(this.stage, p, { x, y })) continue;
      if (Math.hypot(x - p.x, y - p.y) > CELL * 0.6) return { x, y };
    }
    return { ...p.home };
  }

  private stepPanic(dt: number) {
    const p = this.panic;
    if (!p) return;
    for (const f of p.fx) f.pl.step(dt);
    p.fx = p.fx.filter((f) => !f.pl.done);
    if (p.delay > 0) {
      p.delay -= dt;
      return;
    }
    p.bangIn -= dt;
    if (p.bangIn <= 0 && !p.fx.some((f) => f.k === 'fx-panic-bang')) {
      p.fx.push({ k: 'fx-panic-bang', pl: new Player(anim('fx-panic-bang'), false) });
      p.bangIn = rand(1600, 3200);
    }
    if (p.mode === 'startle') {
      p.player.step(dt);
      if (p.player.done) {
        p.mode = 'run';
        p.src = panicRun(p.stage);
        p.player = new Player(anim(p.src));
      }
      return;
    }
    if (!p.target || p.retarget <= 0) {
      p.target = this.panicTarget(p);
      p.retarget = rand(350, 900);
      const nf = p.target.x >= p.x ? 1 : -1;
      if (nf !== p.facing) p.wantFacing = nf;
    }
    p.retarget -= dt;
    const f0 = p.player.f;
    let d = p.player.step(dt);
    if (p.wantFacing && p.player.f !== f0) {
      p.facing = p.wantFacing;
      p.wantFacing = 0;
    }
    if (!(d > 0)) d = (dt / 1000) * 2.4 * CELL;
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const L = Math.hypot(dx, dy);
    if (L <= d) {
      p.x = p.target.x;
      p.y = p.target.y;
      p.retarget = 0;
    } else {
      p.x += (dx / L) * d;
      p.y += (dy / L) * d;
    }
    p.sweatIn -= dt;
    if (p.sweatIn <= 0) {
      p.sweatIn = rand(450, 900);
      p.fx.push({ k: 'fx-panic-sweat', pl: new Player(anim('fx-panic-sweat'), false) });
    }
  }

  private drawPanic() {
    const p = this.panic;
    if (!p) return;
    const half = this.walk.shown / 2;
    const flip = p.facing < 0;
    this.setCreatureFrame(p.src, p.player.f, flip);
    const lift = p.player.lift();
    this.creature.setPosition(this.snap(p.x - half) + half, this.snap(p.y - half) + half);
    this.creatureBody.y = this.snap(lift);
    this.creatureShadow.y = 0;
    this.poseWear(flip, p.src, p.player.f);
    const gx = this.snap(p.x - half);
    const gy = this.snap(p.y - half + lift);
    while (this.panicFx.length < p.fx.length) this.panicFx.add(this.add.sprite(0, 0, 'fx-panic-bang').setOrigin(0));
    const sprites = this.panicFx.list as Phaser.GameObjects.Sprite[];
    p.fx.forEach((f, k) => {
      const a = f.pl.a;
      const at = panicAttach(p.stage, f.k);
      const pv = a.pivot ?? [a.frameWidth / 2, a.frameHeight / 2];
      const fxFlip = flip && f.k !== 'fx-panic-bang';
      const ax = flip ? 32 - at[0] : at[0];
      const px = fxFlip ? a.frameWidth - pv[0] : pv[0];
      const s = sprites[k];
      if (s.texture.key !== f.k) s.setTexture(f.k);
      s.setFrame(f.pl.f)
        .setFlipX(fxFlip)
        .setPosition(gx + ax - px, gy + at[1] - pv[1])
        .setVisible(true);
    });
    for (let k = p.fx.length; k < sprites.length; k += 1) sprites[k].setVisible(false);
  }

  // ------------------------------------------------------------------ 장식 (BeachPlay decor + PlacedDecorDrop)
  private frameBox(id: IslandZoneId) {
    return zoneFrame(this.stage, id);
  }

  /** RN useResponsive().scale 과 같다: PixelRatio.roundToNearestPixel(n × factor) */
  private sc(n: number) {
    return Math.round(n * this.state.factor * this.dpr) / this.dpr;
  }

  private wu(n: number) {
    return this.sc(n) / this.baseDp();
  }

  private dotSprite(id: string, size: number) {
    if (this.textures.exists(`shop-${id}`)) {
      const img = this.add.image(0, 0, `shop-${id}`).setOrigin(0).setDisplaySize(size, size);
      return { img, w: size, h: size };
    }
    const rows = PATTERNS[id as keyof typeof PATTERNS];
    if (!rows) return null;
    const cols = rows[0]?.length || 8;
    const cell = Math.max(2, Math.floor(size / Math.max(cols, 1)));
    const img = this.add.image(0, 0, `dot-${id}`).setOrigin(0).setScale(cell);
    return { img, w: cell * cols, h: cell * rows.length };
  }

  /** 떨어지는 연출을 이미 보여 준 장식. 다른 이유로 다시 그릴 때 또 떨어지지 않게 한다 */
  private freshShown: string | null = null;

  private decorTweens: Phaser.Tweens.Tween[] = [];

  private buildDecor() {
    for (const t of this.decorTweens) t.stop();
    this.decorTweens = [];
    this.decor.removeAll(true);
    const s = this.state;
    const open = new Set(this.openZones(s));
    for (const zone of ISLAND_ZONES) {
      const list = s.placed.filter((e) => e.zoneId === zone.id);
      if (list.length === 0 || !open.has(zone.id)) continue;
      const frame = this.frameBox(zone.id);
      let x = frame.left + frame.width * 0.35;
      const y = frame.top + frame.height * 0.45;
      for (const entry of list.slice(0, 3)) {
        const isFresh = s.lastPlaced?.itemId === entry.itemId;
        const size = this.wu(isFresh ? 32 : 24);
        if (isFresh) {
          this.dropDecor(entry.sprite, x, y, size, this.freshShown !== entry.itemId);
          x += size + this.wu(4);
          continue;
        }
        const spr = this.dotSprite(entry.sprite, size);
        if (!spr) continue;
        spr.img.setPosition(x, y);
        this.decor.add(spr.img);
        x += spr.w + this.wu(4);
      }
    }
    this.freshShown = s.lastPlaced?.itemId ?? null;
  }

  /** 막 심은 장식: 위에서 떨어지며 커졌다가 자리 잡고, 네 방향으로 반짝이가 튄다 */
  private dropDecor(sprite: string, left: number, top: number, size: number, animate: boolean) {
    const box = this.add.container(left + size / 2, top + size / 2);
    const spr = this.dotSprite(sprite, size);
    if (!spr) return;
    spr.img.setPosition(-spr.w / 2, -spr.h / 2);
    const body = this.add.container(0, 0, [spr.img]);
    box.add(body);
    this.decor.add(box);
    if (!animate) return;
    const sparks = [0, 1, 2, 3].map((i) => {
      const r = this.add.rectangle(0, 0, 6, 6, hex(i % 2 === 0 ? pixel.tangerine : pixel.sand)).setAlpha(0);
      box.addAt(r, 0);
      return { r, angle: (i / 4) * Math.PI * 2 };
    });
    const drop = { v: 0 };
    const paint = () => {
      body.y = -size * 0.9 * (1 - drop.v);
      body.setScale(drop.v);
      body.setAlpha(drop.v < 0.2 ? drop.v / 0.2 : 1);
    };
    paint();
    const chain = this.tweens.chain({
      targets: drop,
      tweens: [
        { v: 1.15, duration: 380, ease: 'Back.Out', easeParams: [1.6], onUpdate: paint },
        { v: 1, duration: 140, ease: 'Cubic.InOut', onUpdate: paint },
      ],
    });
    this.decorTweens.push(chain as unknown as Phaser.Tweens.Tween);
    const spark = { t: 0 };
    const sparkTween = this.tweens.add({
      targets: spark,
      t: 1,
      duration: 700,
      ease: 'Quad.Out',
      onUpdate: () => {
        const t = spark.t;
        for (const s of sparks) {
          s.r.setPosition(Math.cos(s.angle) * size * 0.7 * t, Math.sin(s.angle) * size * 0.7 * t);
          s.r.setAlpha(t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7);
        }
      },
    });
    this.decorTweens.push(sparkTween);
  }

  // ------------------------------------------------------------------ 귤새 (WanderingCreature + 모션 엔진)
  private updateWalkers() {
    const s = this.state;
    const w = this.walk;
    w.size = CELL;
    w.unit = w.size / MOTION_SEQ['egg-still'].artSize;
    w.shown = CELL;
    this.creatureBody.setDisplaySize(w.shown, w.shown);
    this.creatureShadow.setDisplaySize(w.shown, w.shown);

    const setup = walkSetup(this.stage);
    const points = setup.points;
    w.setup = setup;
    w.plan = setup.plan;

    const visible = !s.placing && !s.petOpen && !s.hideCreature && points.length > 0;
    const wasVisible = this.creature.visible;
    this.creature.setVisible(visible);
    if (!visible) {
      // RN 에서는 이때 귤새가 사라졌다(언마운트). 다시 나오면 새로 시작한다
      if (wasVisible) w.engine = null;
      w.points = points;
      w.pointsKey = JSON.stringify(points);
      return;
    }

    const key = JSON.stringify(points);
    if (w.engine && key === w.pointsKey) {
      keepOnLand(w.engine, setup);
      return;
    }
    w.points = points;
    w.pointsKey = key;
    if (!w.engine) {
      w.engine = createEngine(stageIdFor(s.level), points[0]);
      return;
    }
    settleOnLand(w.engine, setup);
  }

  private setCreatureFrame(body: string, frame: number, flip: boolean, shadow: string | undefined = `${body}-shadow`) {
    const size = this.walk.shown;
    if (this.creatureBody.texture.key !== body) this.creatureBody.setTexture(body);
    this.creatureBody.setFrame(frame).setDisplaySize(size, size).setFlipX(flip);
    if (shadow && this.textures.exists(shadow)) {
      if (this.creatureShadow.texture.key !== shadow) this.creatureShadow.setTexture(shadow);
      this.creatureShadow.setFrame(frame).setDisplaySize(size, size).setFlipX(flip).setVisible(true);
    } else {
      this.creatureShadow.setVisible(false);
    }
  }

  private drawCreature(delta: number) {
    const w = this.walk;
    const engine = w.engine;
    if (!engine || !this.creature.visible) {
      this.notice.setVisible(false);
      for (const s of this.panicFx.list) (s as Phaser.GameObjects.Sprite).setVisible(false);
      return;
    }
    const stageId = stageIdFor(this.state.level);
    if (engine.stageId !== stageId) {
      engine.stageId = stageId;
      startRest(engine, MOTION_RULES.firstRestMs);
    }
    if (this.panic) {
      this.drawPanic();
      this.drawNotice(this.time.now);
      return;
    }
    advance(engine, Math.min(MAX_TICK_MS, Math.max(0, delta)), w.unit, w.points, false, w.plan);
    if (w.setup) keepOnLand(engine, w.setup);
    const sheet = MOTION_SEQ[engine.seqId].sheet;
    this.setCreatureFrame(sheet.body as unknown as string, engine.frame, engine.facing === -1, sheet.shadow as unknown as string | undefined);
    // 몸만 위로 뜨고(lift) 그림자는 땅에 그대로
    const half = w.shown / 2;
    this.creature.setPosition(this.snap(engine.x - half) + half, this.snap(engine.y - half) + half);
    this.creatureBody.y = this.snap(currentLift(engine, w.unit));
    this.creatureShadow.y = 0;
    this.poseWear(engine.facing === -1, sheet.body as unknown as string, engine.frame);
    this.drawNotice(this.time.now);
  }

  /** 픽셀 느낌표·반짝이 텍스처를 한 번만 만든다 */
  private buildNoticeMarks() {
    // 잔디 위에서 잘 보이게: 먹색 테두리 + 귤/금색 속
    if (!this.textures.exists('pixel-bang-v2')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x3d2e22, 1);
      g.fillRect(1, 0, 6, 2);
      g.fillRect(0, 2, 8, 11);
      g.fillRect(1, 15, 6, 2);
      g.fillRect(2, 19, 4, 4);
      g.fillStyle(0xff9a1a, 1);
      g.fillRect(2, 2, 4, 9);
      g.fillRect(3, 20, 2, 2);
      g.fillStyle(0xffe56a, 1);
      g.fillRect(2, 2, 2, 4);
      g.fillRect(3, 20, 1, 1);
      g.generateTexture('pixel-bang-v2', 8, 23);
      g.destroy();
    }
    if (!this.textures.exists('pixel-spark-v2')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x3d2e22, 1);
      g.fillRect(3, 0, 2, 10);
      g.fillRect(0, 4, 10, 2);
      g.fillStyle(0xffb400, 1);
      g.fillRect(3, 1, 2, 8);
      g.fillRect(1, 4, 8, 2);
      g.fillStyle(0xfff6a0, 1);
      g.fillRect(4, 2, 1, 5);
      g.fillRect(2, 4, 5, 1);
      g.fillStyle(0xffffff, 1);
      g.fillRect(4, 4, 2, 2);
      g.generateTexture('pixel-spark-v2', 10, 10);
      g.destroy();
    }
    this.noticeBang = this.add.image(0, 0, 'pixel-bang-v2').setOrigin(0.5, 1);
    this.noticeSparks = [
      this.add.image(0, 0, 'pixel-spark-v2').setOrigin(0.5),
      this.add.image(0, 0, 'pixel-spark-v2').setOrigin(0.5),
      this.add.image(0, 0, 'pixel-spark-v2').setOrigin(0.5),
    ];
    // 세 반짝이 모두 같은 금색 톤
    this.noticeSparks.forEach((spark) => spark.clearTint());
    this.notice = this.add.container(0, 0, [this.noticeBang, ...this.noticeSparks]).setVisible(false);
  }

  /** 알 위·옆에 느낌표가 통통 튀고 별이 반짝인다 */
  private drawNotice(now: number) {
    const show = Boolean(this.state.noticeEgg) && this.creature.visible;
    this.notice.setVisible(show);
    if (!show) {
      return;
    }
    const unit = Math.max(1, this.state.factor);
    const size = this.walk.shown;
    const bob = Math.sin(now / 220) * 3 * unit;
    const pop = 1 + 0.1 * Math.sin(now / 180);
    // 기준점을 알 몸통 중심에 두고, 느낌표는 위·반짝이는 좌우·아래에 붙인다
    this.notice.setPosition(this.creature.x, this.creature.y - size * 0.12);
    this.noticeBang.setPosition(0, -size * 0.62 + bob);
    this.noticeBang.setScale(2.15 * unit * pop);
    this.noticeBang.setAngle(Math.sin(now / 260) * 6);

    const sparkOffsets = [
      { x: -size * 0.48, y: -size * 0.08, phase: 0 },
      { x: size * 0.5, y: -size * 0.12, phase: 1.7 },
      // 알과 겹치지 않게 발 더 아래쪽으로
      { x: 0, y: size * 0.92, phase: 3.1 },
    ];
    this.noticeSparks.forEach((spark, index) => {
      const offset = sparkOffsets[index]!;
      const pulse = 0.55 + 0.45 * Math.max(0, Math.sin(now / 160 + offset.phase));
      spark.setPosition(offset.x + Math.sin(now / 300 + offset.phase) * 1.5, offset.y + bob * 0.25);
      spark.setScale(unit * (1.2 + pulse * 0.55));
      spark.setAlpha(0.7 + pulse * 0.3);
      spark.setAngle((now / 18 + index * 40) % 360);
    });
  }

  // ------------------------------------------------------------------ 숲 탐험 (gachi-island forest-explore)
  private fe: ForestExplore | null = null;
  private feChar: string | null = null;
  private feLoading = false;
  private feWantStop = false;
  private readonly feTexKey = 'forest-explore-view';

  private stopForestExplore() {
    this.fe = null;
    this.feChar = null;
    this.feWantStop = false;
    this.explore.removeAll(true);
    this.explore.setVisible(false);
    // 마지막 장의 고치가 텍스처에 남지 않게 지운다
    if (this.textures.exists(this.feTexKey)) {
      const tex = this.textures.get(this.feTexKey) as Phaser.Textures.CanvasTexture;
      const ctx = tex.getContext();
      if (ctx) {
        ctx.clearRect(0, 0, FOREST_EXPLORE_CANVAS.w, FOREST_EXPLORE_CANVAS.h);
        tex.refresh();
      }
    }
    if (this.stage === 3) this.forest.setVisible(true);
  }

  private ensureFeTexture() {
    if (this.textures.exists(this.feTexKey)) return;
    const { w, h } = FOREST_EXPLORE_CANVAS;
    const tex = this.textures.createCanvas(this.feTexKey, w, h);
    tex?.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  private layoutForestExploreView() {
    this.ensureFeTexture();
    const origin = forestExploreOrigin();
    this.explore.removeAll(true);
    this.explore.add(this.add.image(0, 0, this.feTexKey).setOrigin(0));
    this.explore.setPosition(origin.x, origin.y).setScale(1).setVisible(true);
  }

  private updateExplore() {
    const s = this.state;
    const show = Boolean(s.explore) && !s.placing && !s.petOpen && this.stage === 3;
    if (!show) {
      // 탐험 종료·보상 대기: 보낸 고치 애니는 바로 걷어 정적 숲만 남긴다
      if (this.fe || this.explore.visible) this.stopForestExplore();
      return;
    }
    this.feWantStop = false;
    this.forest.setVisible(false);
    const level = s.explore?.level ?? 2;
    const char = s.explore?.character ?? forestExploreCharacter(level);
    if (this.fe && this.feChar === char) {
      if (!this.explore.visible) this.layoutForestExploreView();
      return;
    }
    if (this.feLoading) return;
    // 캐릭터가 바뀌면 이전 애니는 버리고 선택한 고치로 다시 시작
    if (this.fe) this.stopForestExplore();
    this.feLoading = true;
    void createForestExplore(char)
      .then((fx) => {
        if (!this.state.explore) {
          // 로딩 중 탐험이 끝나면 고치를 올리지 않는다
          return;
        }
        const want = this.state.explore.character ?? forestExploreCharacter(this.state.explore.level ?? 2);
        if (want !== char) return;
        this.fe = fx;
        this.feChar = char;
        // 숲에 들어가는 intro가 끝나면 RN 타이머를 연다
        this.fe.onPhase = (phase) => {
          if (phase === 'loop') send({ type: 'explore-entered' });
        };
        this.layoutForestExploreView();
      })
      .finally(() => {
        this.feLoading = false;
      });
  }

  private drawExplore(_now: number, delta: number) {
    if (!this.fe || !this.explore.visible) return;
    this.fe.update(delta);
    const tex = this.textures.get(this.feTexKey) as Phaser.Textures.CanvasTexture;
    const ctx = tex.getContext();
    if (!ctx) return;
    ctx.clearRect(0, 0, FOREST_EXPLORE_CANVAS.w, FOREST_EXPLORE_CANVAS.h);
    this.fe.draw(ctx);
    tex.refresh();
    if (this.fe.phase === 'done') this.stopForestExplore();
  }

  // ------------------------------------------------------------------ 프레임
  update(now: number, delta: number) {
    const dt = Math.min(MAX_TICK_MS, Math.max(0, delta));
    this.stepVolcano(dt);
    this.stepExpand(dt);
    this.stepPanic(dt);
    this.drawCreature(delta);
    if (this.seaClock.tick(delta)) {
      this.stepWater();
    }
    this.drawExplore(now, delta);
    this.flushCamera();

    const fps = this.fps;
    fps.frames += 1;
    fps.dur += delta;
    fps.maxGap = Math.max(fps.maxGap, delta);
    if (delta > 33) fps.long += 1;
    if (fps.dur >= 500) {
      send({ type: 'fps', frames: fps.frames, dur: fps.dur, maxGap: Math.round(fps.maxGap), long: fps.long });
      this.fps = { frames: 0, dur: 0, maxGap: 0, long: 0 };
    }
  }
}
