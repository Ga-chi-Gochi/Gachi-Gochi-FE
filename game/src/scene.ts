// 섬 화면 한 장. RN판(BeachHome · BeachPlay · IslandCamera · VolcanoGas)을 같은 좌표·같은 시간으로 옮겼다.
// 좌표 단위는 RN 화면 dp. 카메라 배율에 기기 픽셀 비율(dpr)을 곱해서, 1dp = 도트 1칸이 기기 픽셀 정수배로 그려지게 한다.
import Phaser from 'phaser';

import type { IslandZoneId } from '@/constants/island-zones';
import { ISLAND_ZONES } from '@/constants/island-zones';
import { nearestWalkPoint } from '@/constants/island-terrain';
import { largestRegion } from '@/components/island/walk-route';
import { COLOR, PATTERNS } from '@/constants/pixel-patterns';
import { pixel } from '@/constants/pixel-theme';

import { embedded, listen, send, type GameState, type ToGame } from './bridge';
import {
  CLEAR_MS,
  CLOUD,
  HOLD_MS,
  LAVA_BOIL_MS,
  LAVA_FILL_MS,
  LAVA_SPILL_MS,
  cellFade,
  cloudMotion,
  coverRank,
  paintCloud,
  scallopRank,
  type DrawContext,
} from './gas';
import {
  CELL,
  DEEP_SHEET,
  RAMP_COLORS,
  RAMP_PX,
  RAMP_SHEETS,
  RAMP_SPARKLE_COLOR,
  REVEAL_MS,
  SHORE_SHEET,
  SLICE_PX,
  CRATER_MID,
  CRATER_PIXELS,
  CRATER_SPANS,
  TILE_BLEED,
  VOLCANO_COLS,
  VOLCANO_ROWS,
  buildIslandCells,
  craterCloudPoint,
  islandFrame,
  isWalkable,
  landShape,
  revealDelay,
  shoreHeight,
  splitReveal,
  magmaColor,
  sandStandX,
  sandStandY,
  spills,
  surgeFill,
  volcanoOrigin,
  type IslandCell,
  type RampBlock,
  type Reveal,
  type RevealOrigin,
  type ShoreSlice,
  type SurfaceGrain,
} from './shape';
import {
  MAX_TICK_MS,
  ON_LAND_RADIUS,
  advance,
  createEngine,
  currentLift,
  planRoute,
  stageIdFor,
  startRest,
  startTravel,
  type Engine,
  type Planner,
  type WalkGrid,
} from './creature';
import { MOTION_RULES, MOTION_SEQ, type MotionSheet } from './motion';
import { SPARKLE_ON_FRAMES, SeaClock, waveLag } from './seaClock';

import grassLawnUrl from '../assets/grass-lawn.png';
import sandFillUrl from '../assets/sand-fill.png';
import eggUrl from '../assets/gyulsae-egg.png';
import youngUrl from '../assets/gyulsae-young.png';
import adultUrl from '../assets/gyulsae-adult.png';

const volcanoUrls = import.meta.glob('../assets/volcano-cell-*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>;

/** 깊은 바다 그림판 한 장의 세로 줄 수와 가로 최대 칸 수 (64칸 = 2048px, 모바일 GPU 텍스처 한도 안) */
const SEA_BAND_ROWS = 8;
const SEA_CHUNK_COLS = 64;

/** 지수 님 모션 시트 (assets/motion/sheets 를 1/8 로 줄인 32px 칸). 키 = 파일 이름 */
const motionUrls = import.meta.glob('../assets/motion/*.png', { eager: true, import: 'default' }) as Record<string, string>;

// ------------------------------------------------------------------ 카메라 (island-camera.tsx)
const MIN_ZOOM = 0.62;
const MAX_ZOOM = 2.8;
const PAN_START = 12;

function clampPan(zoom: number, x: number, y: number, width: number, height: number) {
  const span = Math.abs(zoom - 1);
  const maxX = (span * width) / 2 + width * 0.1;
  const maxY = (span * height) / 2 + height * 0.1;
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

// ------------------------------------------------------------------ 섬 위 구역 (beach-play.tsx)
const ZONE_FRAME: Record<IslandZoneId, { x: number; y: number; w: number; h: number }> = {
  core: { x: 0.24, y: 0.28, w: 0.52, h: 0.44 },
  west: { x: 0.0, y: 0.34, w: 0.24, h: 0.36 },
  east: { x: 0.76, y: 0.34, w: 0.24, h: 0.36 },
  north: { x: 0.24, y: 0.16, w: 0.52, h: 0.14 },
  south: { x: 0.24, y: 0.7, w: 0.52, h: 0.12 },
};


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
  explore: null,
  look: 1,
};

function creatureKey(level: number) {
  if (level <= 1) return 'gyulsae-egg';
  if (level <= 3) return 'gyulsae-young';
  return 'gyulsae-adult';
}

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
/** RN Animated.timing 기본 이징 (Easing.inOut(Easing.ease)) */
const easeInOut = (t: number) => Phaser.Math.Easing.Cubic.InOut(t);
/** Reanimated withTiming 기본 이징 (Easing.inOut(Easing.quad)) */
const quadInOut = (t: number) => Phaser.Math.Easing.Quadratic.InOut(t);

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
  /**
   * 깊은 바다 그림판. 칸마다 시간차가 다른 프레임을 가로로 그리고, 같은 줄을 SEA_BAND_ROWS 번 세로로 복사한다.
   * 가로는 최대 SEA_CHUNK_COLS 칸씩 나눈다 (GPU 텍스처 크기 한도). 그림판을 쓰는 Image 들을 세로로 쌓아 깐다.
   */
  private seaChunks: { tex: Phaser.Textures.CanvasTexture; col0: number; cols: number }[] = [];
  private seaCol0 = 0;
  private seaClock = new SeaClock();
  private centerCol = 0;
  private water!: Phaser.GameObjects.Container;
  private rampBlocks: { img: Phaser.GameObjects.Image; lag: number }[] = [];
  private shoreStrips: { img: Phaser.GameObjects.Image; lag: number }[] = [];
  private sparkles: { x: number; y: number; lag: number }[] = [];
  private sparkleGfx!: Phaser.GameObjects.Graphics;
  private waterSeq = 0;
  private quake!: Phaser.GameObjects.Container;
  private rising!: Phaser.GameObjects.Container;
  private terrain!: Phaser.GameObjects.Image;
  private volcano!: Phaser.GameObjects.Container;
  private lava!: Phaser.GameObjects.Graphics;
  private decor!: Phaser.GameObjects.Container;
  private creature!: Phaser.GameObjects.Container;
  private creatureBody!: Phaser.GameObjects.Image;
  private creatureShadow!: Phaser.GameObjects.Image;
  private explore!: Phaser.GameObjects.Container;
  private gas!: Phaser.GameObjects.Graphics;

  private cam = { z: 1, x: 0, y: 0 };
  private camSentAt = 0;
  private camDirty = false;

  private terrainKey = '';
  private terrainSeq = 0;
  private decorKey = '';
  private volcanoAt = { x: 0, y: 0 };

  // 분화
  private eruptAt = -1;
  private calmed = false;
  private spilled = false;
  private gasState: null | {
    started: number;
    originX: number;
    originY: number;
    maxRank: number;
    distance: number;
    revealed: boolean;
    holdUntil: number;
    clearStarted: number;
  } = null;

  // 귤새 (모션 엔진: creature.ts)
  private walk = {
    engine: null as Engine | null,
    points: [] as { x: number; y: number }[],
    pointsKey: '',
    plan: undefined as Planner | undefined,
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
    this.load.image('grass-lawn', grassLawnUrl);
    this.load.image('sand-fill', sandFillUrl);
    this.load.image('gyulsae-egg', eggUrl);
    this.load.image('gyulsae-young', youngUrl);
    this.load.image('gyulsae-adult', adultUrl);
    for (const [path, url] of Object.entries(volcanoUrls)) {
      const m = /volcano-cell-(\d)-(\d)\.png$/.exec(path);
      if (m) this.load.image(`volcano-${m[1]}-${m[2]}`, url);
    }
  }

  create() {
    this.dpr = this.registry.get('dpr') ?? 1;
    this.W = this.scale.width / this.dpr;
    this.H = this.scale.height / this.dpr;

    // 화산 칸은 103px 그림을 32dp에 줄여 쓰던 것이라 RN처럼 부드럽게 줄인다. 나머지는 도트 그대로.
    for (let r = 0; r < VOLCANO_ROWS; r += 1) {
      for (let c = 0; c < VOLCANO_COLS; c += 1) {
        this.textures.get(`volcano-${r}-${c}`).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
    this.makeDotTextures();

    // 층: 섬 세계(바다 포함, 확대·이동) → 화산재(화면 고정)
    // 바다도 섬과 같은 세계에 둔다. 끌거나 확대하면 바다와 섬이 한 화면처럼 같이 움직인다.
    this.world = this.add.container(0, 0);
    this.overlay = this.add.container(0, 0);

    this.sea = this.add.container(0, 0);
    this.layoutSea();

    this.quake = this.add.container(0, 0);
    // 얕은 물(3단계 색 블록·디더링 점·반짝이)과 남쪽 해안 파도 띠. 땅 아래에 깔리고 땅과 같이 흔들린다
    this.water = this.add.container(0, 0);
    this.sparkleGfx = this.add.graphics();
    this.rising = this.add.container(0, 0);
    this.terrain = this.add.image(0, 0, '__DEFAULT').setOrigin(0).setVisible(false);
    this.volcano = this.add.container(0, 0);
    this.lava = this.add.graphics();
    this.quake.add([this.water, this.sparkleGfx, this.rising, this.terrain, this.volcano, this.lava]);

    this.decor = this.add.container(0, 0);
    this.creature = this.add.container(0, 0);
    this.creatureShadow = this.add.image(0, 0, 'juvenile-idle-shadow', 0);
    this.creatureBody = this.add.image(0, 0, 'juvenile-idle', 0);
    this.creature.add([this.creatureShadow, this.creatureBody]);
    this.creature.setVisible(false);
    this.explore = this.add.container(0, 0).setVisible(false);
    // 깊은 바다는 흔들림(quake) 밖에 둔다. 원래도 깊은 바다는 안 흔들렸다.
    this.world.add([this.sea, this.quake, this.decor, this.creature, this.explore]);

    this.gas = this.add.graphics();
    this.overlay.add(this.gas);

    // 카메라: main = 배경색만(고정), worldCam = 바다+섬(확대·이동), fixedCam = 화산재(고정)
    const main = this.cameras.main;
    main.setBackgroundColor('#1C8481');
    this.worldCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.fixedCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    main.ignore([this.world, this.overlay]);
    this.worldCam.ignore([this.overlay]);
    this.fixedCam.ignore([this.world]);
    for (const c of [main, this.worldCam, this.fixedCam]) c.setRoundPixels(true);
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
    const x0 = Math.floor((-1.2 * this.W) / CELL) * CELL;
    const y0 = Math.floor((-1.2 * this.H) / CELL) * CELL;
    const x1 = Math.ceil((2.2 * this.W) / CELL) * CELL;
    const y1 = Math.ceil((2.2 * this.H) / CELL) * CELL;
    this.centerCol = Math.floor(islandFrame(this.W, this.H).cx / CELL);
    this.seaCol0 = x0 / CELL;
    const old = this.seaChunks.map((c) => c.tex.key);
    this.sea.removeAll(true);
    this.seaChunks = [];
    const totalCols = (x1 - x0) / CELL;
    const bandH = SEA_BAND_ROWS * CELL;
    for (let c = 0; c < totalCols; c += SEA_CHUNK_COLS) {
      const cols = Math.min(SEA_CHUNK_COLS, totalCols - c);
      const tex = this.textures.createCanvas(`sea-${(this.waterSeq += 1)}`, cols * CELL, bandH);
      if (!tex) continue;
      this.seaChunks.push({ tex, col0: this.seaCol0 + c, cols });
      for (let y = y0; y < y1; y += bandH) {
        this.sea.add(this.add.image(x0 + c * CELL, y, tex.key).setOrigin(0));
      }
    }
    this.paintSea();
    for (const key of old) this.textures.remove(key);
  }

  /** 바다 시계가 넘어갈 때마다 깊은 바다를 다시 그린다 (칸마다 시간차). 첫 줄을 그리고 아래로 복사한다 */
  private paintSea() {
    const sheet = DEEP_SHEET as MotionSheet;
    const src = this.textures.get(sheet.body as unknown as string).getSourceImage() as CanvasImageSource;
    for (const chunk of this.seaChunks) {
      const ctx = chunk.tex.getContext();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < chunk.cols; i += 1) {
        const f = this.seaClock.shown(waveLag(chunk.col0 + i, this.centerCol));
        ctx.drawImage(src, (f % sheet.cols) * CELL, Math.floor(f / sheet.cols) * CELL, CELL, CELL, i * CELL, 0, CELL, CELL);
      }
      for (let r = 1; r < SEA_BAND_ROWS; r += 1) {
        ctx.drawImage(chunk.tex.getSourceImage() as CanvasImageSource, 0, 0, chunk.cols * CELL, CELL, 0, r * CELL, chunk.cols * CELL, CELL);
      }
      chunk.tex.refresh();
    }
  }

  /** 얕은 물 블록·해안 띠의 시트 프레임과 반짝이를 지금 바다 시계에 맞춘다 */
  private stepWater() {
    for (const b of this.rampBlocks) b.img.setFrame(this.seaClock.shown(b.lag));
    for (const s of this.shoreStrips) {
      const crop = s.img.getData('crop') as [number, number, number, number];
      s.img.setFrame(this.seaClock.shown(s.lag));
      s.img.setCrop(crop[0], crop[1], crop[2], crop[3]);
    }
    const g = this.sparkleGfx;
    g.clear();
    if (this.sparkles.length === 0) return;
    g.fillStyle(hex(RAMP_SPARKLE_COLOR), 1);
    for (const sp of this.sparkles) {
      if (this.seaClock.shown(sp.lag) < SPARKLE_ON_FRAMES) g.fillRect(sp.x, sp.y, RAMP_PX, RAMP_PX);
    }
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

  private applyCamera(force = false) {
    const { z, x, y } = this.cam;
    this.worldCam.setZoom(this.dpr * z);
    this.worldCam.centerOn(this.W / 2 - x / z, this.H / 2 - y / z);
    this.camDirty = true;
    if (force) this.flushCamera(true);
  }

  private flushCamera(force = false) {
    const now = this.time.now;
    if (!this.camDirty || (!force && now - this.camSentAt < 60)) return;
    this.camDirty = false;
    this.camSentAt = now;
    send({ type: 'camera', zoom: this.cam.z, x: this.cam.x, y: this.cam.y, w: this.W, h: this.H });
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
    return Boolean(this.gasState && this.gasState.distance > 8);
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
    if (!this.creature.visible) return;
    const w = this.worldCam.getWorldPoint(p.x, p.y);
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
      this.startErupt();
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
    const tKey = JSON.stringify([this.W, this.H, next.zones, next.growing, next.look]);
    if (force || tKey !== this.terrainKey) {
      this.terrainKey = tKey;
      this.buildTerrain();
    }
    const dKey = JSON.stringify([this.W, this.H, next.placed, next.lastPlaced, next.zones, next.growing, next.factor]);
    if (force || dKey !== this.decorKey) {
      this.decorKey = dKey;
      this.buildDecor();
    }
    this.updateWalkers();
    this.updateExplore();
  }

  // ------------------------------------------------------------------ 섬 땅 (BeachHome)
  private buildTerrain() {
    const { W, H } = this;
    const s = this.state;
    const island = buildIslandCells(W, H, s.zones, s.growing, s.look);
    const { cells, grains } = island;

    // 고정된 타일 칸 + 점들을 캔버스 한 장에 미리 그린다. (RN은 이것들이 전부 View 였다)
    const tiles = cells.filter((c) => c.riseDelay == null && !(c.kind === 'sand' || c.fine));
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const g of grains) {
      x0 = Math.min(x0, g.x);
      y0 = Math.min(y0, g.y);
      x1 = Math.max(x1, g.x + g.size);
      y1 = Math.max(y1, g.y + (g.height ?? g.size));
    }
    for (const c of tiles) {
      x0 = Math.min(x0, c.x * CELL);
      y0 = Math.min(y0, c.y * CELL);
      x1 = Math.max(x1, (c.x + 1) * CELL + TILE_BLEED);
      y1 = Math.max(y1, (c.y + 1) * CELL + TILE_BLEED);
    }

    const oldKey = this.terrain.texture.key;
    if (Number.isFinite(x0)) {
      x0 = Math.floor(x0);
      y0 = Math.floor(y0);
      const w = Math.max(1, Math.ceil(x1) - x0);
      const h = Math.max(1, Math.ceil(y1) - y0);
      const key = `terrain-${(this.terrainSeq += 1)}`;
      const tex = this.textures.createCanvas(key, w, h);
      if (tex) {
        const ctx = tex.getContext();
        ctx.imageSmoothingEnabled = false;
        for (const c of tiles) {
          const img = this.textures.get(c.kind === 'sand' ? 'sand-fill' : 'grass-lawn').getSourceImage() as CanvasImageSource;
          ctx.drawImage(img, c.x * CELL - x0, c.y * CELL - y0, CELL + TILE_BLEED, CELL + TILE_BLEED);
        }
        for (const g of grains) {
          ctx.fillStyle = g.color;
          ctx.fillRect(g.x - x0, g.y - y0, g.size, g.height ?? g.size);
        }
        tex.refresh();
        this.terrain.setTexture(key).setPosition(x0, y0).setVisible(true);
      }
    } else {
      this.terrain.setVisible(false);
    }
    if (oldKey.startsWith('terrain-')) this.textures.remove(oldKey);

    // 솟아오르는 칸 (RisingCell): 0.45배·투명 → 1배, 380ms, 가운데서 먼 칸일수록 늦게
    this.tweens.killTweensOf(this.rising.list);
    this.rising.removeAll(true);
    for (const c of cells) {
      if (c.riseDelay == null) continue;
      this.rising.add(this.risingCell(c));
    }

    this.buildWater(island);

    // 화산 칸 (휴화산 4×3)
    const origin = volcanoOrigin(W, H);
    this.volcanoAt = { x: origin.x * CELL, y: origin.y * CELL };
    this.volcano.removeAll(true);
    for (let r = 0; r < VOLCANO_ROWS; r += 1) {
      for (let c = 0; c < VOLCANO_COLS; c += 1) {
        const img = this.add
          .image((origin.x + c) * CELL, (origin.y + r) * CELL, `volcano-${r}-${c}`)
          .setOrigin(0)
          .setDisplaySize(CELL, CELL);
        this.volcano.add(img);
      }
    }
  }

  /**
   * 얕은 물과 남쪽 해안 (beach-home 의 ShallowRampLayer · ShoreSlices, 'ramp' 방식).
   * - 블록: 32칸마다 얕은 물 시트 t1~t3 중 하나를 칸 시간차에 맞춰 재생
   * - 점: 단계 사이 디더링(고정) → 한 장으로 미리 그림
   * - 해안 띠: 파도 시트를 8px 세로 띠로 잘라 섬 곡선을 따라 붙임
   * - 섬이 솟는 중(before 있음)에는 사라지는 것·새로 생기는 것을 가운데서 먼 순서로 380ms 동안 흐리게/진하게
   */
  private buildWater(island: ReturnType<typeof buildIslandCells>) {
    this.tweens.killTweensOf(this.water.list);
    this.water.removeAll(true);
    this.rampBlocks = [];
    this.shoreStrips = [];
    this.sparkles = [];
    const ramp = island.ramp;
    const slices = island.slices;
    if (!ramp && !slices) {
      this.stepWater();
      return;
    }
    const shape = landShape(this.W, this.H);
    const origin: RevealOrigin = { cx: shape.cx, cy: shape.cy };
    const before = island.before;

    const blockImg = (block: RampBlock) => {
      const sheet = RAMP_SHEETS[block.stage] as MotionSheet;
      const lag = waveLag(Math.floor(block.x / CELL), this.centerCol);
      const img = this.add
        .image(block.x, block.y, sheet.body as unknown as string, this.seaClock.shown(lag))
        .setOrigin(0)
        .setDisplaySize(block.size, block.size);
      this.rampBlocks.push({ img, lag });
      return img;
    };
    const sliceImgs = (slice: ShoreSlice) => {
      const col = Math.floor(slice.x / CELL);
      const lag = waveLag(col, this.centerCol);
      const height = shoreHeight(slice);
      const cropX = slice.x - col * CELL;
      const img = this.add
        .image(col * CELL, slice.top, SHORE_SHEET.body as unknown as string, this.seaClock.shown(lag))
        .setOrigin(0)
        .setData('crop', [cropX, 0, SLICE_PX, height]);
      img.setCrop(cropX, 0, SLICE_PX, height);
      this.shoreStrips.push({ img, lag });
      const parts: Phaser.GameObjects.GameObject[] = [img];
      if (slice.opacity < 1) {
        // 띠가 짧아지는 곳은 아래 두 줄을 얕은 물 색 점으로 섞는다 (ShoreSliceStrip melt)
        const melt = this.add.graphics();
        melt.fillStyle(hex(RAMP_COLORS[0]), 1);
        for (const y of [height - RAMP_PX * 2, height - RAMP_PX]) {
          for (let i = 0; i < SLICE_PX / RAMP_PX; i += 1) {
            if ((i + (slice.x + y) / RAMP_PX) % 2 === 0) melt.fillRect(slice.x + i * RAMP_PX, slice.top + y, RAMP_PX, RAMP_PX);
          }
        }
        parts.push(melt);
      }
      return parts;
    };
    const dotsImage = (dots: SurfaceGrain[]) => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const d of dots) {
        x0 = Math.min(x0, d.x);
        y0 = Math.min(y0, d.y);
        x1 = Math.max(x1, d.x + d.size);
        y1 = Math.max(y1, d.y + (d.height ?? d.size));
      }
      x0 = Math.floor(x0);
      y0 = Math.floor(y0);
      const key = `ramp-dots-${(this.waterSeq += 1)}`;
      const tex = this.textures.createCanvas(key, Math.max(1, Math.ceil(x1) - x0), Math.max(1, Math.ceil(y1) - y0));
      if (!tex) return dotsGfx(dots);
      const ctx = tex.getContext();
      for (const d of dots) {
        ctx.fillStyle = d.color;
        ctx.fillRect(d.x - x0, d.y - y0, d.size, d.height ?? d.size);
      }
      tex.refresh();
      const img = this.add.image(x0, y0, key).setOrigin(0);
      img.once('destroy', () => this.textures.remove(key));
      return img;
    };
    const dotsGfx = (dots: SurfaceGrain[]) => {
      const g = this.add.graphics();
      for (const d of dots) {
        g.fillStyle(hex(d.color), 1);
        g.fillRect(d.x, d.y, d.size, d.height ?? d.size);
      }
      return g;
    };
    /** stay 는 그대로, gone 은 흐려지며 사라지고, fresh 는 진해지며 나타난다 (RevealGroup) */
    const place = <T,>(
      reveal: Reveal<T>,
      make: (items: T[]) => Phaser.GameObjects.GameObject[],
      makeStay: (items: T[]) => Phaser.GameObjects.GameObject[] = make,
    ) => {
      this.water.add(makeStay(reveal.stay));
      for (const [list, appear] of [
        [reveal.gone, false],
        [reveal.fresh, true],
      ] as const) {
        for (const [delay, items] of list) {
          const objs = make(items) as unknown as (Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Alpha)[];
          for (const o of objs) o.setAlpha(appear ? 0 : 1);
          this.water.add(objs);
          this.tweens.add({ targets: objs, alpha: appear ? 1 : 0, duration: REVEAL_MS, delay, ease: 'Cubic.Out' });
        }
      }
    };

    if (ramp) {
      const blocks = splitReveal(
        ramp.blocks,
        before?.ramp?.blocks,
        (b) => `${b.key}:${b.stage}:${b.size}`,
        (b) => revealDelay(b.x + b.size / 2, b.y + b.size / 2, origin),
      );
      place(blocks, (items) => items.map(blockImg));
      const dots = splitReveal(
        ramp.dots,
        before?.ramp?.dots,
        (d) => `${d.key}:${d.color}:${d.size}`,
        (d) => revealDelay(d.x + d.size / 2, d.y, origin),
      );
      place(
        dots,
        (items) => (items.length ? [dotsGfx(items)] : []),
        (items) => (items.length ? [dotsImage(items)] : []),
      );
      // 반짝이는 섬이 솟는 동안에는 쉰다
      if (!before) this.sparkles = ramp.sparkles.map((sp) => ({ x: sp.x, y: sp.y, lag: ((sp.lag % 32) + 32) % 32 }));
    }
    if (slices) {
      const reveal = splitReveal(
        slices,
        before?.slices,
        (sl) => `${sl.x}:${sl.top}:${sl.opacity}`,
        (sl) => revealDelay(sl.x + SLICE_PX / 2, sl.top, origin),
      );
      place(reveal, (items) => items.flatMap(sliceImgs));
    }
    this.stepWater();
  }

  private risingCell(cell: IslandCell) {
    const img = this.add
      .image(cell.x * CELL + CELL / 2, cell.y * CELL + CELL / 2, cell.kind === 'sand' ? 'sand-fill' : 'grass-lawn')
      .setDisplaySize(CELL, CELL);
    const base = img.scaleX;
    img.setScale(base * 0.45).setAlpha(0);
    this.tweens.add({
      targets: img,
      scale: base,
      alpha: 1,
      duration: 380,
      delay: cell.riseDelay ?? 0,
      ease: 'Cubic.Out',
    });
    return img;
  }

  // ------------------------------------------------------------------ 분화: 흔들림·용암·화산재
  private startErupt() {
    if (this.eruptAt >= 0) return;
    this.eruptAt = this.time.now;
    this.calmed = false;
    this.spilled = false;
    // AshCloud 는 분화가 시작될 때 자리를 잡는다 (그때 카메라 기준 화구 위치)
    const mouth = craterCloudPoint(this.W, this.H);
    const originX = this.W / 2 + (mouth.x - this.W / 2) * this.cam.z + this.cam.x;
    const originY = this.H / 2 + (mouth.y - this.H / 2) * this.cam.z + this.cam.y;
    this.gasState = {
      started: this.time.now,
      originX,
      originY,
      maxRank: coverRank(this.W, this.H, originX, originY),
      distance: 0,
      revealed: false,
      holdUntil: -1,
      clearStarted: -1,
    };
  }

  private updateErupt(now: number) {
    if (this.eruptAt < 0) {
      this.quake.x = 0;
      return;
    }
    const elapsed = now - this.eruptAt;
    const burstAt = LAVA_FILL_MS + LAVA_BOIL_MS;
    // Quake: 50ms씩 0→4→-4→0, 20번 (구름이 터지면 멈춘다)
    if (!this.calmed && elapsed < 3000) {
      const t = elapsed % 150;
      this.quake.x =
        t < 50 ? easeInOut(t / 50) * 4 : t < 100 ? 4 - easeInOut((t - 50) / 50) * 8 : -4 + easeInOut((t - 100) / 50) * 4;
    } else {
      this.quake.x = 0;
    }
    if (!this.calmed && elapsed >= burstAt) {
      this.calmed = true;
      send({ type: 'calm' });
    }
    if (!this.spilled && elapsed >= burstAt + LAVA_SPILL_MS) {
      this.spilled = true;
      this.lava.clear();
      send({ type: 'fog' });
    }
    if (!this.spilled) this.drawLava(elapsed);
  }

  private drawLava(elapsed: number) {
    const g = this.lava;
    g.clear();
    const fill = surgeFill(elapsed / LAVA_FILL_MS);
    const boiling = elapsed >= LAVA_FILL_MS && elapsed < LAVA_FILL_MS + LAVA_BOIL_MS;
    const spill = Math.max(0, Math.min(1, (elapsed - LAVA_FILL_MS - LAVA_BOIL_MS) / LAVA_SPILL_MS));
    const rowProgress = fill * CRATER_SPANS.length;
    const fullRows = Math.floor(rowProgress);
    const partial = rowProgress - fullRows;
    const surfaceRow = Math.min(CRATER_SPANS.length - 1, fullRows);
    const { x: ox, y: oy } = this.volcanoAt;
    for (const p of CRATER_PIXELS) {
      const shown = p.row < fullRows || (p.row === fullRows && p.fromCenter <= partial);
      if (!shown) continue;
      const onSurface = p.row >= surfaceRow - 2 || (boiling && p.y <= 6);
      const wave = Math.sin(elapsed / 60 + p.x * 0.65 + p.y * 0.35);
      const bubble = onSurface && wave > 0.2;
      const pop = onSurface && Math.sin(elapsed / 130 + p.x * 1.4) > 0.55;
      const bob = pop ? 4 : bubble ? 2 : 0;
      const overflow = spill > 0 && spills(p);
      const lift = 5 + (1 - Math.min(1, Math.abs(p.x - CRATER_MID) / 18)) * 9;
      const fade = overflow && spill > 0.72 ? 1 - (spill - 0.72) / 0.28 : 1;
      g.fillStyle(hex(magmaColor(p, onSurface, elapsed)), fade);
      g.fillRect(
        ox + p.x + (overflow ? Math.sign(p.x - CRATER_MID) * 3 * spill : 0),
        oy + p.y - bob - (overflow ? lift * spill : 0),
        2,
        2,
      );
    }
  }

  private ashSentAt = 0;

  /** 화면 몇 곳의 화산재 진하기(0~1). RN 버튼·상단 바가 구름에 덮이는 것처럼 흐려지게 쓴다 */
  private sendAsh(now: number, spread: number, hole: number, force = false) {
    const st = this.gasState;
    if (!force && now - this.ashSentAt < 50) return;
    this.ashSentAt = now;
    if (!st) {
      send({ type: 'ash', top: 0, mid: 0, bottom: 0, block: false });
      return;
    }
    const at = (px: number, py: number) => {
      const dx = px - st.originX;
      const dy = py - st.originY;
      return Math.round(cellFade(scallopRank(Math.hypot(dx, dy), Math.atan2(dy, dx)), spread, hole) * 20) / 20;
    };
    send({
      type: 'ash',
      top: at(this.W / 2, 56),
      mid: at(this.W / 2, this.H * 0.25),
      bottom: at(this.sc(68), this.H - 90),
      block: st.distance > 8,
    });
  }

  private updateGas(now: number) {
    const st = this.gasState;
    if (!st) return;
    const g = this.gas;
    const cloud = hex(CLOUD);
    let alpha = 1;
    const ctx: DrawContext = {
      clearRect: () => g.clear(),
      fillRect: (x, y, w, h) => {
        g.fillStyle(cloud, alpha);
        g.fillRect(x, y, w, h);
      },
      setTransform: () => undefined,
      fillStyle: CLOUD,
      get globalAlpha() {
        return alpha;
      },
      set globalAlpha(v: number) {
        alpha = v;
      },
    };

    if (st.clearStarted < 0 && st.holdUntil < 0) {
      // 퍼지기: 화면을 다 덮을 때까지 (VolcanoGas grow)
      const motion = cloudMotion(now - st.started, st.maxRank);
      if (motion.target <= 0 && st.distance <= 0) return;
      st.distance = Math.min(motion.target, st.distance + motion.step);
      paintCloud(ctx, this.W, this.H, st.originX, st.originY, st.distance, 0);
      this.sendAsh(now, st.distance, 0);
      if (st.distance >= st.maxRank - 0.5) {
        if (!st.revealed) {
          st.revealed = true;
          send({ type: 'reveal' });
        }
        st.holdUntil = now + HOLD_MS;
      }
      return;
    }
    if (st.clearStarted < 0) {
      if (now < st.holdUntil) return;
      st.clearStarted = now;
      this.sendAsh(now, st.maxRank, 0, true);
    }
    const u = Math.min(1, (now - st.clearStarted) / CLEAR_MS);
    const curved = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
    paintCloud(ctx, this.W, this.H, st.originX, st.originY, st.maxRank, curved * st.maxRank);
    this.sendAsh(now, st.maxRank, curved * st.maxRank);
    if (u >= 1) {
      g.clear();
      this.gasState = null;
      this.eruptAt = -1;
      this.sendAsh(now, 0, 0, true);
      send({ type: 'done' });
    }
  }

  // ------------------------------------------------------------------ 장식 (BeachPlay decor + PlacedDecorDrop)
  private frameBox(id: IslandZoneId) {
    const f = ZONE_FRAME[id];
    return { left: f.x * this.W, top: f.y * this.H, width: f.w * this.W, height: f.h * this.H };
  }

  /** RN useResponsive().scale 과 같다: PixelRatio.roundToNearestPixel(n × factor) */
  private sc(n: number) {
    return Math.round(n * this.state.factor * this.dpr) / this.dpr;
  }

  private dotSprite(id: string, size: number) {
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
        const size = this.sc(isFresh ? 32 : 24);
        if (isFresh) {
          this.dropDecor(entry.sprite, x, y, size, this.freshShown !== entry.itemId);
          x += size + this.sc(4);
          continue;
        }
        const spr = this.dotSprite(entry.sprite, size);
        if (!spr) continue;
        spr.img.setPosition(x, y);
        this.decor.add(spr.img);
        x += spr.w + this.sc(4);
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
  /** beach-play pointsOnBeach: 열린 구역마다 네 점. 알은 화산 남쪽 모래 한 점 */
  private rawWalkPoints() {
    const { W, H } = this;
    if (W === 0 || H === 0) return [];
    if (this.state.level <= 1) return [{ x: sandStandX(W, H), y: sandStandY(W, H) }];
    const points: { x: number; y: number }[] = [];
    for (const id of this.openZones(this.state)) {
      const frame = this.frameBox(id);
      for (const across of [0.28, 0.72]) {
        for (const down of [0.32, 0.68]) {
          points.push({ x: frame.left + frame.width * across, y: frame.top + frame.height * down });
        }
      }
    }
    return points;
  }

  /** beach-play walkGrid: 걸을 수 있는 32칸(화산·물가 제외) 중 가장 큰 덩어리. 알은 길찾기 없음 */
  private walkGrid(): WalkGrid | undefined {
    const { W, H } = this;
    if (this.state.level <= 1 || W === 0 || H === 0) return undefined;
    const zones = this.openZones(this.state);
    const canWalk = (x: number, y: number) => isWalkable(x, y, W, H, zones);
    const cells: { col: number; row: number }[] = [];
    for (let row = 0; row < Math.ceil(H / CELL); row += 1) {
      for (let col = 0; col < Math.ceil(W / CELL); col += 1) {
        if (canWalk((col + 0.5) * CELL, (row + 0.5) * CELL)) cells.push({ col, row });
      }
    }
    return { cell: CELL, cells: largestRegion(cells), canWalk };
  }

  private updateWalkers() {
    const s = this.state;
    const w = this.walk;
    w.size = this.sc(s.level >= 4 ? 44 : s.level >= 3 ? 40 : 36);
    w.unit = w.size / MOTION_SEQ['egg-still'].artSize;
    // 32칸 그림이 기기 픽셀 정수배로 그려지게 보이는 크기만 맞춘다 (흐림·들쭉날쭉 방지). 움직임은 원래 크기 기준
    const px = Math.max(1, Math.round((w.size * this.dpr) / 32));
    w.shown = (px * 32) / this.dpr;
    this.creatureBody.setDisplaySize(w.shown, w.shown);
    this.creatureShadow.setDisplaySize(w.shown, w.shown);

    const footOffset = w.size / 2;
    const raw = this.rawWalkPoints();
    const grid = this.walkGrid();
    let points = raw;
    if (grid && grid.cells.length > 0) {
      const cellPoints = grid.cells.map((c) => ({ x: (c.col + 0.5) * grid.cell, y: (c.row + 0.5) * grid.cell - footOffset }));
      const first = raw[0] ? nearestWalkPoint(cellPoints, raw[0]) : null;
      points = first ? [first, ...cellPoints.filter((p) => p !== first)] : cellPoints;
    }
    w.plan = grid ? (from, to) => planRoute(grid, footOffset, from, to) : undefined;

    const visible = !s.placing && !s.petOpen && points.length > 0;
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
    if (w.engine && key === w.pointsKey) return;
    w.points = points;
    w.pointsKey = key;
    if (!w.engine) {
      w.engine = createEngine(stageIdFor(s.level), points[0]);
      return;
    }
    // 땅이 바뀌면: 가까운 점이 멀면 그쪽으로 이동한다 (WanderingCreature walkPoints effect)
    const engine = w.engine;
    const nearest = nearestWalkPoint(points, engine);
    if (!nearest) return;
    const onLand = points.some((p) => Math.hypot(p.x - engine.x, p.y - engine.y) < ON_LAND_RADIUS);
    if (!onLand) startTravel(engine, w.plan?.(engine, nearest) ?? [nearest]);
  }

  private drawCreature(delta: number) {
    const w = this.walk;
    const engine = w.engine;
    if (!engine || !this.creature.visible) return;
    const stageId = stageIdFor(this.state.level);
    if (engine.stageId !== stageId) {
      engine.stageId = stageId;
      startRest(engine, MOTION_RULES.firstRestMs);
    }
    advance(engine, Math.min(MAX_TICK_MS, Math.max(0, delta)), w.unit, w.points, false, w.plan);
    const sheet = MOTION_SEQ[engine.seqId].sheet;
    const body = sheet.body as unknown as string;
    if (this.creatureBody.texture.key !== body) this.creatureBody.setTexture(body);
    this.creatureBody.setFrame(engine.frame).setDisplaySize(w.shown, w.shown);
    const shadow = sheet.shadow as unknown as string | undefined;
    if (shadow) {
      if (this.creatureShadow.texture.key !== shadow) this.creatureShadow.setTexture(shadow);
      this.creatureShadow.setFrame(engine.frame).setDisplaySize(w.shown, w.shown).setVisible(true);
    } else {
      this.creatureShadow.setVisible(false);
    }
    const flip = engine.facing === -1;
    this.creatureBody.setFlipX(flip);
    this.creatureShadow.setFlipX(flip);
    // 몸만 위로 뜨고(lift) 그림자는 땅에 그대로
    this.creature.setPosition(engine.x, engine.y);
    this.creatureBody.y = currentLift(engine, w.unit);
    this.creatureShadow.y = 0;
  }

  // ------------------------------------------------------------------ 탐험 중 미니 수색 (ExploreWaitingAnim map)
  private exploreParts: null | {
    treeL: Phaser.GameObjects.Container;
    treeR: Phaser.GameObjects.Container;
    leaf: Phaser.GameObjects.Arc;
    sand: Phaser.GameObjects.Arc;
    gochi: Phaser.GameObjects.Image;
    f: number;
    level: number;
    boxH: number;
  } = null;

  private updateExplore() {
    const s = this.state;
    const show = Boolean(s.explore) && !s.placing && !s.petOpen;
    const f = s.factor;
    const level = s.explore?.level ?? 1;
    if (!show) {
      this.explore.setVisible(false);
      return;
    }
    this.explore.setPosition(this.W * 0.06, this.H * 0.42).setVisible(true);
    const parts = this.exploreParts;
    if (parts && parts.f === f && parts.level === level) return;
    this.explore.removeAll(true);
    const boxW = 72 * f;
    const boxH = 64 * f;
    const tree = (size: number) => {
      const spr = this.dotSprite('tree', size);
      const c = this.add.container(0, 0);
      if (spr) {
        spr.img.setPosition(-spr.w / 2, -spr.h / 2);
        c.add(spr.img);
        c.setSize(spr.w, spr.h);
      }
      return { c, w: spr?.w ?? 0, h: spr?.h ?? 0 };
    };
    const tl = tree(22 * f);
    tl.c.setPosition(tl.w / 2, 4 * f + tl.h / 2);
    const tr = tree(24 * f);
    tr.c.setPosition(boxW - tr.w / 2, 2 * f + tr.h / 2);
    const leaf = this.add.circle(22 * f + 2.5 * f, 8 * f + 2.5 * f, 2.5 * f, hex(pixel.leaf));
    const sand = this.add.circle(30 * f + 2 * f, 12 * f + 2 * f, 2 * f, hex(pixel.sand));
    const size = 16 * f;
    const gochi = this.add.image(0, boxH - 2 * f - size / 2, creatureKey(level)).setDisplaySize(size, size);
    this.explore.add([tl.c, tr.c, leaf, sand, gochi]);
    this.exploreParts = { treeL: tl.c, treeR: tr.c, leaf, sand, gochi, f, level, boxH };
  }

  private drawExplore(now: number) {
    const p = this.exploreParts;
    if (!p || !this.explore.visible) return;
    const f = p.f;
    const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);
    // 고치가 수풀 사이를 오간다 (1100ms씩)
    const leg = Math.floor(now / 1100) % 2;
    const u = ease((now % 1100) / 1100);
    const left = 8 * f;
    const right = 36 * f;
    const x = leg === 0 ? left + (right - left) * u : right - (right - left) * u;
    const half = (now % 320) / 160;
    const bob = -2.5 * quadInOut(half < 1 ? half : 2 - half);
    p.gochi.setPosition(x + (8 * f), p.boxH - 2 * f - 8 * f + bob);
    p.gochi.setFlipX(Math.floor(now / 1100) % 2 === 1);
    // 나무 흔들림
    p.treeL.setAngle(-1 + 5 * Math.sin((2 * Math.PI * now) / 1040));
    p.treeR.setAngle(5 * Math.sin((2 * Math.PI * now) / 960 + Math.PI / 2));
    // 잎 튀기 (240ms 올라가고, 400ms 머물고, 280ms 내려오고, 500ms 쉼)
    const t = now % 1420;
    const v = t < 240 ? 1 - (1 - t / 240) ** 2 : t < 640 ? 1 : t < 920 ? 1 - quadInOut((t - 640) / 280) : 0;
    for (const dot of [p.leaf, p.sand]) {
      dot.setAlpha(v * 0.85);
      dot.setScale(0.7 + v * 0.4);
    }
    p.leaf.y = 8 * f + 2.5 * f - v * 6;
    p.sand.y = 12 * f + 2 * f - v * 6;
  }

  // ------------------------------------------------------------------ 프레임
  update(now: number, delta: number) {
    this.updateErupt(now);
    this.updateGas(now);
    this.drawCreature(delta);
    if (this.seaClock.tick(delta)) {
      this.paintSea();
      this.stepWater();
    }
    this.drawExplore(now);
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
