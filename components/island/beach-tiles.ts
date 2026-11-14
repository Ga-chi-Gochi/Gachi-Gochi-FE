import type { ImageSource } from 'expo-image';

/** 섬, 모래, 파도, 바다가 같은 정사각 칸을 쓴다. */
export const CELL = 32;

/** 기본 바다 01–05. 칸의 가로 순서가 타일 이름 순서와 같다. */
export const seaTiles: ImageSource[] = [
  require('@/assets/images/beach/tiles/sea-01.png'),
  require('@/assets/images/beach/tiles/sea-02.png'),
  require('@/assets/images/beach/tiles/sea-03.png'),
  require('@/assets/images/beach/tiles/sea-04.png'),
  require('@/assets/images/beach/tiles/sea-05.png'),
];

/**
 * 해안기 0(모래→포말)부터 4(깊은 물)까지.
 * 한 줄의 다섯 장은 왼쪽부터 1–5라서 물결이 가로로 이어진다.
 */
export const coastTiles: ImageSource[][] = [
  [
    require('@/assets/images/beach/tiles/coast-0-1.png'),
    require('@/assets/images/beach/tiles/coast-0-2.png'),
    require('@/assets/images/beach/tiles/coast-0-3.png'),
    require('@/assets/images/beach/tiles/coast-0-4.png'),
    require('@/assets/images/beach/tiles/coast-0-5.png'),
  ],
  [
    require('@/assets/images/beach/tiles/coast-1-1.png'),
    require('@/assets/images/beach/tiles/coast-1-2.png'),
    require('@/assets/images/beach/tiles/coast-1-3.png'),
    require('@/assets/images/beach/tiles/coast-1-4.png'),
    require('@/assets/images/beach/tiles/coast-1-5.png'),
  ],
  [
    require('@/assets/images/beach/tiles/coast-2-1.png'),
    require('@/assets/images/beach/tiles/coast-2-2.png'),
    require('@/assets/images/beach/tiles/coast-2-3.png'),
    require('@/assets/images/beach/tiles/coast-2-4.png'),
    require('@/assets/images/beach/tiles/coast-2-5.png'),
  ],
  [
    require('@/assets/images/beach/tiles/coast-3-1.png'),
    require('@/assets/images/beach/tiles/coast-3-2.png'),
    require('@/assets/images/beach/tiles/coast-3-3.png'),
    require('@/assets/images/beach/tiles/coast-3-4.png'),
    require('@/assets/images/beach/tiles/coast-3-5.png'),
  ],
  [
    require('@/assets/images/beach/tiles/coast-4-1.png'),
    require('@/assets/images/beach/tiles/coast-4-2.png'),
    require('@/assets/images/beach/tiles/coast-4-3.png'),
    require('@/assets/images/beach/tiles/coast-4-4.png'),
    require('@/assets/images/beach/tiles/coast-4-5.png'),
  ],
];

export const grassFill = require('@/assets/images/beach/tiles/grass-fill.png') as ImageSource;
export const grassDarkFill = require('@/assets/images/beach/tiles/grass-dark-fill.png') as ImageSource;
export const sandFill = require('@/assets/images/beach/tiles/sand-fill.png') as ImageSource;

/** 하얀 점이 박힌 잔디. 넓은 들판에 쓴다. */
export const grassField = require('@/assets/images/beach/grass.png') as ImageSource;
/** 그보다 진하고 점이 박힌 잔디. 들판 아래 가로 띠에 쓴다. */
export const grassDarkField = require('@/assets/images/beach/grass-dark.png') as ImageSource;
/** 해변 모래. 칸마다 같은 결이 이어진다. */
export const sandBeach = require('@/assets/images/beach/sand.png') as ImageSource;
