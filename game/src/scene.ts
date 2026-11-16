// 섬 화면 한 장. RN판(BeachHome · BeachPlay · IslandCamera · VolcanoGas)을 같은 좌표·같은 시간으로 옮겼다.
// 좌표 단위는 RN 화면 dp. 카메라 배율에 기기 픽셀 비율(dpr)을 곱해서, 1dp = 도트 1칸이 기기 픽셀 정수배로 그려지게 한다.
import Phaser from 'phaser';

import type { IslandZoneId } from '@/constants/island-zones';
import { ISLAND_ZONES } from '@/constants/island-zones';
import { nearestWalkPoint } from '@/constants/island-terrain';
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
  CRATER_MID,
  CRATER_PIXELS,
  CRATER_SPANS,
  TILE_BLEED,
  VOLCANO_COLS,
  VOLCANO_ROWS,
  buildIslandCells,
  craterCloudPoint,
  magmaColor,
  sandStandX,
  sandStandY,
  spills,
  surgeFill,
  volcanoOrigin,
  type IslandCell,
} from './shape';

import seaUrl1 from '../assets/sea-01.png';
import seaUrl2 from '../assets/sea-02.png';
import seaUrl3 from '../assets/sea-03.png';
import seaUrl4 from '../assets/sea-04.png';
import seaUrl5 from '../assets/sea-05.png';
import grassLawnUrl from '../assets/grass-lawn.png';
import sandFillUrl from '../assets/sand-fill.png';
import eggUrl from '../assets/gyulsae-egg.png';
import youngUrl from '../assets/gyulsae-young.png';
import adultUrl from '../assets/gyulsae-adult.png';

const volcanoUrls = import.meta.glob('../assets/volcano-cell-*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>;

const SEA_URLS = [seaUrl1, seaUrl2, seaUrl3, seaUrl4, seaUrl5];

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

type WalkPoint = { x: number; y: number };

// ------------------------------------------------------------------ 귤새 걷기 (wandering-creature.tsx)
const WALK_SPEED = 16;
const IDLE_MS_MIN = 1600;
const IDLE_MS_MAX = 4200;
const MOVE_MS_MIN = 3200;
const MOVE_MS_MAX = 11000;

const rand = (min: number, max: number) => min + Math.random() * Math.max(0, max - min);

function pickPoint(points: WalkPoint[], avoid?: WalkPoint | null): WalkPoint | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];
  let next = points[Math.floor(Math.random() * points.length)];
  if (avoid) {
    for (let i = 0; i < 4; i += 1) {
      const candidate = points[Math.floor(Math.random() * points.length)];
      if (Math.hypot(candidate.x - avoid.x, candidate.y - avoid.y) > 18) {
        next = candidate;
        break;
      }
    }
  }
  return next;
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
  private seaLayer!: Phaser.GameObjects.Container;
  private world!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;

  private sea!: Phaser.GameObjects.TileSprite;
  private quake!: Phaser.GameObjects.Container;
  private rising!: Phaser.GameObjects.Container;
  private terrain!: Phaser.GameObjects.Image;
  private volcano!: Phaser.GameObjects.Container;
  private lava!: Phaser.GameObjects.Graphics;
  private decor!: Phaser.GameObjects.Container;
  private creature!: Phaser.GameObjects.Container;
  private creatureImg!: Phaser.GameObjects.Image;
  private creatureShadow!: Phaser.GameObjects.Graphics;
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

  // 귤새
  private walk = {
    points: [] as WalkPoint[],
    pointsKey: '',
    paused: false,
    pos: { x: 0, y: 0 },
    moving: false,
    facing: 'right' as 'left' | 'right',
    tween: null as Phaser.Tweens.Tween | null,
    timer: null as Phaser.Time.TimerEvent | null,
    idleSince: 0,
    size: 36,
    placedOnce: false,
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
    SEA_URLS.forEach((url, i) => this.load.image(`sea-${i}`, url));
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
    this.makeSeaStrip();
    this.makeDotTextures();

    // 층: 섬 세계(바다 포함, 확대·이동) → 화산재(화면 고정)
    // 바다도 섬과 같은 세계에 둔다. 끌거나 확대하면 바다와 섬이 한 화면처럼 같이 움직인다.
    this.seaLayer = this.add.container(0, 0);
    this.world = this.add.container(0, 0);
    this.overlay = this.add.container(0, 0);

    this.sea = this.add.tileSprite(0, 0, 1, 1, 'sea-strip').setOrigin(0);
    this.layoutSea();

    this.quake = this.add.container(0, 0);
    this.rising = this.add.container(0, 0);
    this.terrain = this.add.image(0, 0, '__DEFAULT').setOrigin(0).setVisible(false);
    this.volcano = this.add.container(0, 0);
    this.lava = this.add.graphics();
    this.quake.add([this.rising, this.terrain, this.volcano, this.lava]);

    this.decor = this.add.container(0, 0);
    this.creature = this.add.container(0, 0);
    this.creatureShadow = this.add.graphics();
    this.creatureImg = this.add.image(0, 0, 'gyulsae-young');
    this.creature.add([this.creatureShadow, this.creatureImg]);
    this.creature.setVisible(false);
    this.explore = this.add.container(0, 0).setVisible(false);
    // 바다는 흔들림(quake) 밖에 둔다. 원래도 땅만 흔들렸다.
    this.world.add([this.sea, this.quake, this.decor, this.creature, this.explore]);

    this.gas = this.add.graphics();
    this.overlay.add(this.gas);

    // 카메라: main = 바다(고정), worldCam = 섬, fixedCam = 화산재
    const main = this.cameras.main;
    main.setBackgroundColor('#1C8481');
    this.worldCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.fixedCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    main.ignore([this.world, this.overlay]);
    this.worldCam.ignore([this.seaLayer, this.overlay]);
    this.fixedCam.ignore([this.seaLayer, this.world]);
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
   * 바다를 화면보다 넓게 깐다. 가장 작게 축소(0.62)하고 끝까지 끌어도 빈 곳이 안 보이게
   * 화면 크기의 -1.2배 ~ +2.2배를 덮는다. 칸 무늬(sea-01..05)는 섬 좌표 0 에서 시작하도록 맞춘다.
   */
  private layoutSea() {
    const strip = CELL * 5;
    const x0 = Math.floor((-1.2 * this.W) / strip) * strip;
    const y0 = Math.floor((-1.2 * this.H) / CELL) * CELL;
    const x1 = Math.ceil((2.2 * this.W) / strip) * strip;
    const y1 = Math.ceil((2.2 * this.H) / CELL) * CELL;
    this.sea.setPosition(x0, y0).setSize(x1 - x0, y1 - y0);
  }

  // ------------------------------------------------------------------ 텍스처
  private makeSeaStrip() {
    // RN SeaFill: 칸의 가로 순서 = sea-01..05, 세로는 같은 줄 반복. 다섯 장을 이어 붙여 한 장을 깔면 같다.
    const tex = this.textures.createCanvas('sea-strip', CELL * 5, CELL);
    if (!tex) return;
    const ctx = tex.getContext();
    for (let i = 0; i < 5; i += 1) {
      ctx.drawImage(this.textures.get(`sea-${i}`).getSourceImage() as CanvasImageSource, i * CELL, 0);
    }
    tex.refresh();
  }

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
    const cx = this.creature.x;
    const cy = this.creature.y;
    if (Math.abs(w.x - cx) <= half && Math.abs(w.y - cy) <= half) {
      send({ type: 'tapCreature' });
    }
  }

  // ------------------------------------------------------------------ RN 메시지
  private onMessage(msg: ToGame) {
    if (msg.type === 'state') {
      const { type: _type, ...next } = msg;
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
    const { cells, grains } = buildIslandCells(W, H, s.zones, s.growing, s.look);

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

  // ------------------------------------------------------------------ 귤새 (WanderingCreature)
  private walkPoints(): WalkPoint[] {
    const { W, H } = this;
    if (W === 0 || H === 0) return [];
    if (this.state.level <= 1) return [{ x: sandStandX(W, H), y: sandStandY(W, H) }];
    const points: WalkPoint[] = [];
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

  private updateWalkers() {
    const s = this.state;
    const w = this.walk;
    const level = s.level;
    w.size = this.sc(level >= 4 ? 44 : level >= 3 ? 40 : 36);
    // 32칸 그림이 기기 픽셀 정수배로 그려지게 크기를 맞춘다 (흐림·들쭉날쭉 방지)
    const px = Math.max(1, Math.round((w.size * this.dpr) / 32));
    const shown = (px * 32) / this.dpr;
    this.creatureImg.setTexture(creatureKey(level)).setDisplaySize(shown, shown);
    this.creatureImg.y = -3;
    // RN: 폭 size×0.55, 높이 4, 모서리 2 인 반투명 그림자
    const sw = w.size * 0.55;
    this.creatureShadow.clear();
    this.creatureShadow.fillStyle(0x1a1520, 0.18);
    this.creatureShadow.fillRoundedRect(-sw / 2, shown / 2 - 1, sw, 4, 2);

    const points = this.walkPoints();
    const paused = level <= 1;
    const visible = !s.placing && !s.petOpen && points.length > 0;
    const wasVisible = this.creature.visible;
    this.creature.setVisible(visible);
    if (!visible && wasVisible) {
      // RN 에서는 이때 귤새가 사라졌다(언마운트). 걷기·타이머도 멈춘다
      this.stopWalk();
    }
    if (visible && !wasVisible && w.placedOnce && points.length > 0) {
      // 다시 나타날 때는 첫 점에서 오른쪽을 보고 서 있다가 잠시 뒤 걷는다 (새로 마운트된 것과 같게)
      this.stopWalk();
      w.pos = { ...points[0] };
      w.facing = 'right';
      w.points = points;
      w.pointsKey = JSON.stringify(points);
      w.paused = level <= 1;
      if (!w.paused) w.timer = this.time.delayedCall(rand(600, 1400), () => this.walkOnce());
      return;
    }

    const key = JSON.stringify(points);
    const pausedChanged = paused !== w.paused;
    const countChanged = points.length !== w.points.length;
    w.paused = paused;
    if (key === w.pointsKey && !pausedChanged) return;
    w.pointsKey = key;
    w.points = points;
    if (points.length === 0) return;

    if (!w.placedOnce) {
      w.placedOnce = true;
      w.pos = { ...points[0] };
      this.creature.setPosition(w.pos.x, w.pos.y);
    }

    // 땅이 바뀌면 가까운 점으로 돌아온다
    const nearest = nearestWalkPoint(points, w.pos);
    if (nearest) {
      if (paused) {
        this.stopWalk();
        w.pos = { x: nearest.x, y: nearest.y };
        this.creature.setPosition(w.pos.x, w.pos.y);
      } else if (!points.some((p) => Math.hypot(p.x - w.pos.x, p.y - w.pos.y) < 28)) {
        const dist = Math.hypot(nearest.x - w.pos.x, nearest.y - w.pos.y);
        const duration = Math.min(MOVE_MS_MAX, Math.max(1200, (dist / WALK_SPEED) * 1000));
        this.walkTo(nearest, duration, 'Quad.InOut', false);
      }
    }

    if (pausedChanged || countChanged) {
      w.timer?.remove();
      w.timer = null;
      if (!paused) {
        w.timer = this.time.delayedCall(rand(600, 1400), () => this.walkOnce());
      }
    }
  }

  private stopWalk() {
    const w = this.walk;
    w.tween?.stop();
    w.tween = null;
    w.timer?.remove();
    w.timer = null;
    w.moving = false;
    w.idleSince = this.time.now;
  }

  private walkTo(target: WalkPoint, duration: number, ease: string, chain: boolean) {
    const w = this.walk;
    w.tween?.stop();
    w.facing = target.x >= w.pos.x ? 'right' : 'left';
    w.moving = true;
    w.tween = this.tweens.add({
      targets: w.pos,
      x: target.x,
      y: target.y,
      duration,
      ease,
      onComplete: () => {
        w.moving = false;
        w.idleSince = this.time.now;
        w.tween = null;
        if (chain && !w.paused) {
          w.timer = this.time.delayedCall(rand(IDLE_MS_MIN, IDLE_MS_MAX), () => this.walkOnce());
        }
      },
    });
  }

  private walkOnce() {
    const w = this.walk;
    w.timer = null;
    if (w.paused) return;
    const target = pickPoint(w.points, w.pos);
    if (!target) return;
    const dist = Math.hypot(target.x - w.pos.x, target.y - w.pos.y);
    if (dist < 8) {
      w.timer = this.time.delayedCall(rand(IDLE_MS_MIN, IDLE_MS_MAX), () => this.walkOnce());
      return;
    }
    const duration = Math.min(MOVE_MS_MAX, Math.max(MOVE_MS_MIN, (dist / WALK_SPEED) * 1000));
    this.walkTo(target, duration, 'Sine.InOut', true);
  }

  private drawCreature(now: number) {
    const w = this.walk;
    // 쉬는 동안 900ms씩 2dp 오르내린다
    const bob = w.moving ? 0 : -2 * (0.5 - 0.5 * Math.cos((2 * Math.PI * (now - w.idleSince)) / 1800));
    this.creature.setPosition(w.pos.x, w.pos.y + bob);
    this.creatureImg.setFlipX(w.facing === 'left');
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
    this.drawCreature(now);
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
