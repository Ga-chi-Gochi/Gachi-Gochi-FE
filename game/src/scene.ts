// 섬 화면 한 장. RN판(BeachHome · BeachPlay · IslandCamera · VolcanoGas)을 같은 좌표·같은 시간으로 옮겼다.
// 좌표 단위는 RN 화면 dp. 카메라 배율에 기기 픽셀 비율(dpr)을 곱해서, 1dp = 도트 1칸이 기기 픽셀 정수배로 그려지게 한다.
import Phaser from 'phaser';

import { toIslandStage, type IslandStageId } from '@/constants/island-stages';
import type { IslandZoneId } from '@/constants/island-zones';
import { ISLAND_ZONES, getIslandStage } from '@/constants/island-zones';
import { COLOR, PATTERNS } from '@/constants/pixel-patterns';
import { pixel } from '@/constants/pixel-theme';

import { embedded, listen, send, type GameState, type ToGame, type ZoneBoxes } from './bridge';
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
  SEA_PLAIN_COLOR,
  SHORE_FOAM,
  SHORE_TUCK,
  SOFT_SHORE_SHEET,
  CRATER_MID,
  CRATER_PIXELS,
  CRATER_SPANS,
  VOLCANO_COLS,
  VOLCANO_ROWS,
  craterCloudPoint,
  magmaColor,
  shoreCells,
  spills,
  stageArt,
  surgeFill,
  volcanoFrame,
  zoneFrame,
} from './shape';
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
import { MOTION_RULES, MOTION_SEQ } from './motion';
import { SeaClock, waveLag } from './seaClock';
import { keepOnLand, settleOnLand, shiftEngine, walkSetup, type WalkSetup } from './walker';

import eggUrl from '../assets/island-v3/gyulsae-egg.png';
import youngUrl from '../assets/island-v3/gyulsae-young.png';
import adultUrl from '../assets/island-v3/gyulsae-adult.png';
import seaPlainUrl from '../assets/island-v3/sea-plain.png';
import stage1Url from '../assets/island-v3/stage1.png';
import stage2Url from '../assets/island-v3/stage2.png';
import stage3Url from '../assets/island-v3/stage3.png';
import seaShoreSoftUrl from '../assets/tiles-v2/sea-shore-soft.png';

const volcanoUrls = import.meta.glob('../assets/volcano-cell-*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>;

/** 지수 님 모션 시트 (assets/motion/sheets 를 1/8 로 줄인 32px 칸). 키 = 파일 이름 */
const motionUrls = import.meta.glob('../assets/motion/*.png', { eager: true, import: 'default' }) as Record<string, string>;

const stageUrls: Record<IslandStageId, string> = { 1: stage1Url, 2: stage2Url, 3: stage3Url };

const animUrls = import.meta.glob('../assets/anims/*/*.png', { eager: true, import: 'default' }) as Record<string, string>;

const shopUrls = import.meta.glob('../assets/shop/*.png', { eager: true, import: 'default' }) as Record<string, string>;

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
  private seaClock = new SeaClock();
  private centerCol = 0;
  private stage: IslandStageId = 1;
  private water!: Phaser.GameObjects.Container;
  private rampBlocks: { img: Phaser.GameObjects.Image; lag: number }[] = [];
  private quake!: Phaser.GameObjects.Container;
  private terrain!: Phaser.GameObjects.Image;
  private volcano!: Phaser.GameObjects.Container;
  private lava!: Phaser.GameObjects.Graphics;
  private decor!: Phaser.GameObjects.Container;
  private creature!: Phaser.GameObjects.Container;
  private creatureBody!: Phaser.GameObjects.Image;
  private creatureShadow!: Phaser.GameObjects.Image;
  /** 온보딩: 알을 가리키는 픽셀 느낌표·반짝이 */
  private notice!: Phaser.GameObjects.Container;
  private noticeBang!: Phaser.GameObjects.Image;
  private noticeSparks: Phaser.GameObjects.Image[] = [];
  private explore!: Phaser.GameObjects.Container;
  private gas!: Phaser.GameObjects.Graphics;

  private cam = { z: 1, x: 0, y: 0 };
  private camSentAt = 0;
  private camDirty = false;

  private terrainKey = '';
  private decorKey = '';

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
    for (const [path, url] of Object.entries(animUrls)) {
      const m = /anims\/([\w-]+)\/(sheet|shadow)\.png$/.exec(path);
      if (m) this.load.spritesheet(m[2] === 'sheet' ? m[1] : `${m[1]}-shadow`, url, { frameWidth: 32, frameHeight: 32 });
    }
    this.load.spritesheet('tile-sea-shore-soft', seaShoreSoftUrl, { frameWidth: 32, frameHeight: 32 });
    this.load.image('v3-sea-plain', seaPlainUrl);
    for (const [id, url] of Object.entries(stageUrls)) this.load.image(`v3-stage${id}`, url);
    this.load.image('gyulsae-egg', eggUrl);
    this.load.image('gyulsae-young', youngUrl);
    this.load.image('gyulsae-adult', adultUrl);
    for (const [path, url] of Object.entries(volcanoUrls)) {
      const m = /volcano-cell-(\d)-(\d)\.png$/.exec(path);
      if (m) this.load.image(`volcano-${m[1]}-${m[2]}`, url);
    }
    for (const [path, url] of Object.entries(shopUrls)) {
      const m = /shop\/([\w-]+)\.png$/.exec(path);
      if (m) this.load.image(`shop-${m[1]}`, url);
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
    this.terrain = this.add.image(0, 0, '__DEFAULT').setOrigin(0).setVisible(false);
    this.volcano = this.add.container(0, 0);
    this.lava = this.add.graphics();
    this.quake.add([this.terrain, this.water, this.volcano, this.lava]);

    this.decor = this.add.container(0, 0);
    this.creature = this.add.container(0, 0);
    this.creatureShadow = this.add.image(0, 0, 'juvenile-idle-shadow', 0);
    this.creatureBody = this.add.image(0, 0, 'juvenile-idle', 0);
    this.creature.add([this.creatureShadow, this.creatureBody]);
    this.creature.setVisible(false);
    this.buildNoticeMarks();
    this.explore = this.add.container(0, 0).setVisible(false);
    // 깊은 바다는 흔들림(quake) 밖에 둔다. 원래도 깊은 바다는 안 흔들렸다.
    this.world.add([this.sea, this.quake, this.decor, this.creature, this.notice, this.explore]);

    this.gas = this.add.graphics();
    this.overlay.add(this.gas);

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

  private toScreen(wx: number, wy: number) {
    const zd = this.shownZoom();
    const { cx, cy } = this.viewCenter();
    return { x: this.W / 2 + (wx - cx) * zd, y: this.H / 2 + (wy - cy) * zd };
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
    const tKey = JSON.stringify([this.W, this.H, next.zones, next.growing]);
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
    this.placeVolcano();
  }

  private placeVolcano() {
    const f = volcanoFrame(this.stage);
    this.volcano.removeAll(true);
    this.volcano.setPosition(f.x, f.y).setScale(f.scale);
    for (let r = 0; r < VOLCANO_ROWS; r += 1) {
      for (let c = 0; c < VOLCANO_COLS; c += 1) {
        this.volcano.add(this.add.image(c * CELL, r * CELL, `volcano-${r}-${c}`).setOrigin(0).setDisplaySize(CELL, CELL));
      }
    }
    this.lava.setPosition(f.x, f.y).setScale(f.scale);
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

  // ------------------------------------------------------------------ 분화: 흔들림·용암·화산재
  private startErupt() {
    if (this.eruptAt >= 0) return;
    this.eruptAt = this.time.now;
    this.calmed = false;
    this.spilled = false;
    // AshCloud 는 분화가 시작될 때 자리를 잡는다 (그때 카메라 기준 화구 위치)
    const mouth = craterCloudPoint(this.stage);
    const { x: originX, y: originY } = this.toScreen(mouth.x, mouth.y);
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
        p.x + (overflow ? Math.sign(p.x - CRATER_MID) * 3 * spill : 0),
        p.y - bob - (overflow ? lift * spill : 0),
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

  private drawCreature(delta: number) {
    const w = this.walk;
    const engine = w.engine;
    if (!engine || !this.creature.visible) {
      this.notice.setVisible(false);
      return;
    }
    const stageId = stageIdFor(this.state.level);
    if (engine.stageId !== stageId) {
      engine.stageId = stageId;
      startRest(engine, MOTION_RULES.firstRestMs);
    }
    advance(engine, Math.min(MAX_TICK_MS, Math.max(0, delta)), w.unit, w.points, false, w.plan);
    if (w.setup) keepOnLand(engine, w.setup);
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
    const half = w.shown / 2;
    this.creature.setPosition(this.snap(engine.x - half) + half, this.snap(engine.y - half) + half);
    this.creatureBody.y = this.snap(currentLift(engine, w.unit));
    this.creatureShadow.y = 0;
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
    const art = stageArt(this.stage);
    // 서쪽 섬 육지 (RN EXPLORE_WEST_FRAME). develop art 좌표계 + scale 유지, 바다 쪽 0.06 대신 안쪽
    this.explore
      .setPosition(art.width * 0.18, art.height * 0.4)
      .setScale(1 / this.baseDp())
      .setVisible(true);
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
