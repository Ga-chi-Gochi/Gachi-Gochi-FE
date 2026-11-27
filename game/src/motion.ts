// constants/island-motion.ts 를 그대로 옮겼다. 그림은 require 대신 게임 텍스처 이름(game/assets/motion/*.png, 1/8 크기)이다.
import { anim } from './anims';

type ImageSource = string;

export type MotionSeqId =
  | 'sea-shore'
  | 'egg-still'
  | 'egg-hop'
  | 'juvenile-idle'
  | 'juvenile-fly-struggle'
  | 'juvenile-takeoff'
  | 'juvenile-land'
  | 'adult-idle'
  | 'adult-waddle'
  | 'gyulsae-egg-idle-a'
  | 'gyulsae-egg-waddle'
  | 'gyulsae-juvenile-idle'
  | 'gyulsae-juvenile-takeoff'
  | 'gyulsae-juvenile-fly-struggle'
  | 'gyulsae-juvenile-land'
  | 'gyulsae-adult-idle'
  | 'gyulsae-adult-waddle';

export type MotionSheet = {
  frameCount: number;
  cols: number;
  rows: number;
  body: ImageSource;
  shadow?: ImageSource;
};

/** 원래 시트는 칸 256px(8배). 게임용은 1/8 로 줄인 32px 칸이다 */
export const MOTION_SHEET_FRAME_SIZE = 32;

export type MotionSeq = {
  frameMs: readonly number[];
  motion: readonly number[];
  lift: readonly number[];
  artSize: number;
  sheet: MotionSheet;
};

export type MotionStageId = 'egg' | 'juvenile' | 'adult';

export type MotionStage = {
  rest: MotionSeqId;
  move: MotionSeqId;
  takeoff?: MotionSeqId;
  land?: MotionSeqId;
  kind: 'move' | 'flight';
  size: number;
};

function fromAnim(id: string): MotionSeq {
  const a = anim(id);
  return {
    frameMs: a.durationsMs,
    motion: a.motionPx,
    lift: a.liftPx,
    artSize: a.frameWidth,
    sheet: {
      frameCount: a.frameCount,
      cols: a.frameCount,
      rows: 1,
      body: a.id,
      shadow: a.shadow ? a.id + '-shadow' : undefined,
    },
  };
}

export const MOTION_SEQ: Record<MotionSeqId, MotionSeq> = {
  'sea-shore': {
    frameMs: [110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110, 110],
    motion: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    lift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    artSize: 32,
    sheet: {
      frameCount: 32,
      cols: 8,
      rows: 4,
      body: 'sea-shore',
    },
  },
  'egg-still': {
    frameMs: [100],
    motion: [0],
    lift: [0],
    artSize: 32,
    sheet: {
      frameCount: 1,
      cols: 1,
      rows: 1,
      body: 'egg-still',
      shadow: 'egg-still-shadow',
    },
  },
  'egg-hop': {
    frameMs: [120, 90, 50, 60, 120, 50, 80, 70],
    motion: [0, 0, 3, 4, 3, 4, 1, 0],
    lift: [0, 0, 0, 0, 0, 0, 0, 0],
    artSize: 32,
    sheet: {
      frameCount: 8,
      cols: 8,
      rows: 1,
      body: 'egg-hop',
      shadow: 'egg-hop-shadow',
    },
  },
  'juvenile-idle': {
    frameMs: [450, 120, 420, 120, 450, 120, 260, 50, 90, 70, 120, 120, 400, 120, 300, 150, 120],
    motion: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    lift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    artSize: 32,
    sheet: {
      frameCount: 17,
      cols: 8,
      rows: 3,
      body: 'juvenile-idle',
      shadow: 'juvenile-idle-shadow',
    },
  },
  'juvenile-fly-struggle': {
    frameMs: [80, 40, 50, 50, 50, 50, 50, 50, 50, 50, 60, 80, 40, 50, 40, 50, 40, 50, 60],
    motion: [2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
    lift: [-5, -5, -6, -5, -6, -4, -5, -3, -4, -2, -3, -2, -3, -5, -5, -5, -6, -7, -6],
    artSize: 32,
    sheet: {
      frameCount: 19,
      cols: 8,
      rows: 3,
      body: 'juvenile-fly-struggle',
      shadow: 'juvenile-fly-struggle-shadow',
    },
  },
  'juvenile-takeoff': {
    frameMs: [140, 160, 60, 90, 100],
    motion: [0, 0, 1, 2, 3],
    lift: [0, 0, -1, -3, -4],
    artSize: 32,
    sheet: {
      frameCount: 5,
      cols: 5,
      rows: 1,
      body: 'juvenile-takeoff',
      shadow: 'juvenile-takeoff-shadow',
    },
  },
  'juvenile-land': {
    frameMs: [100, 60, 100, 110, 100, 160],
    motion: [3, 2, 2, 1, 0, 0],
    lift: [-4, -3, -2, 0, 0, 0],
    artSize: 32,
    sheet: {
      frameCount: 6,
      cols: 6,
      rows: 1,
      body: 'juvenile-land',
      shadow: 'juvenile-land-shadow',
    },
  },
  'adult-idle': {
    frameMs: [480, 130, 450, 130, 480, 130, 280, 50, 100, 70, 120, 130, 430, 130, 320, 160, 130],
    motion: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    lift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    artSize: 32,
    sheet: {
      frameCount: 17,
      cols: 8,
      rows: 3,
      body: 'adult-idle',
      shadow: 'adult-idle-shadow',
    },
  },
  'adult-waddle': {
    frameMs: [110, 110, 110, 110, 110, 110, 110, 110],
    motion: [1, 1, 1, 1, 1, 1, 1, 1],
    lift: [0, 0, 0, 0, 0, 0, 0, 0],
    artSize: 32,
    sheet: {
      frameCount: 8,
      cols: 8,
      rows: 1,
      body: 'adult-waddle',
      shadow: 'adult-waddle-shadow',
    },
  },
  'gyulsae-egg-idle-a': fromAnim('gyulsae-egg-idle-a'),
  'gyulsae-egg-waddle': fromAnim('gyulsae-egg-waddle'),
  'gyulsae-juvenile-idle': fromAnim('gyulsae-juvenile-idle'),
  'gyulsae-juvenile-takeoff': fromAnim('gyulsae-juvenile-takeoff'),
  'gyulsae-juvenile-fly-struggle': fromAnim('gyulsae-juvenile-fly-struggle'),
  'gyulsae-juvenile-land': fromAnim('gyulsae-juvenile-land'),
  'gyulsae-adult-idle': fromAnim('gyulsae-adult-idle'),
  'gyulsae-adult-waddle': fromAnim('gyulsae-adult-waddle'),
};

export const MOTION_STAGES: Record<MotionStageId, MotionStage> = {
  egg: { rest: 'gyulsae-egg-idle-a', move: 'gyulsae-egg-waddle', kind: 'move', size: 52 },
  juvenile: {
    rest: 'gyulsae-juvenile-idle',
    move: 'gyulsae-juvenile-fly-struggle',
    takeoff: 'gyulsae-juvenile-takeoff',
    land: 'gyulsae-juvenile-land',
    kind: 'flight',
    size: 64,
  },
  adult: { rest: 'gyulsae-adult-idle', move: 'gyulsae-adult-waddle', kind: 'move', size: 84 },
};

export const MOTION_RULES = {
  scale: 8,
  tilePt: 64,
  note: '모션 페이지(gachigochi-island.vercel.app/motions) 코드에서 그대로 옮긴 값',
  tile: '바다 타일은 32px 그림을 64pt 칸으로 이어 깔기. 아래 바다(shore, shallow)와 위 바다(deep)는 프레임 수가 32로 같아 같은 프레임 번호로 같이 재생(110ms)',
  sizeNote: 'size = 섬 가운데 줄 크기(모션 페이지 기본값). 앱 코드 원래 값은 egg 36, juvenile 40, adult 44. 모두 scale() 적용',
  restMs: [1600, 4200] as const,
  firstRestMs: [600, 1400] as const,
  points: 'beach-play.tsx pointsOnBeach([core])와 같음: fx=0.24W, fy=0.28H, fw=0.52W, fh=0.44H, a in [0.28,0.72], d in [0.32,0.68] -> (fx+fw*a, fy+fh*d) 네 지점',
  pickTarget: '네 지점 중 무작위, 지금 위치와 18pt 넘게 떨어진 곳을 최대 4번까지 다시 뽑음. 8pt 미만이면 바로 쉬기',
  facing: '목표 x가 지금 x 이상이면 오른쪽(1), 아니면 좌우 반전(-1)',
  movePerFrame: '이동 거리(pt) = 그 프레임 motion 값 * (size/32) * (그 프레임에서 지난 시간/프레임 ms). 프레임 안에서도 고르게 나눠 이동해야 발이 안 미끄러짐',
  lift: '몸만 위로(lift * size/32), 그림자는 땅에 그대로. 프레임 사이 lift는 다음 프레임 값까지 선형으로 이어짐',
  flight: 'takeoff 1회 -> fly 반복 -> 남은 거리 <= land motion 합*(size/32)+0.5 이고 fly 마지막 프레임이면 land 1회 -> 쉬기',
  box: '귤새는 size x size 상자 가운데가 (x, y). 아래쪽(y+size/2)이 큰 순서로 위에 그림',
  stages: MOTION_STAGES,
};
