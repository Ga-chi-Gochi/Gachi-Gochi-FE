// 코드로 그리는 도트 스프라이트의 색과 모양. 앱(pixel-sprite)과 섬 게임(game/)이 같이 쓴다.
// RN 모듈을 가져오지 않는 순수 데이터라서 웹뷰 게임 빌드에서도 읽을 수 있다.
import type { PixelSpriteId } from '@/constants/pixel-assets';
import { pixel } from '@/constants/pixel-theme';

export const COLOR: Record<string, string> = {
  '.': 'transparent',
  K: pixel.ink,
  W: pixel.white,
  Y: '#FFE08A',
  O: pixel.tangerine,
  G: pixel.grass,
  D: pixel.grassDeep,
  S: pixel.sand,
  B: pixel.soil,
  R: pixel.lava,
  A: pixel.ash,
  C: pixel.sky,
  L: pixel.leaf,
  U: pixel.sea,
  /** 알 껍질 크림 */
  E: '#FFF6E8',
  /** 볼터치 */
  P: '#FF9BB0',
  /** 입/눈동자 브라운 */
  M: '#4A2E1A',
  /** 귤 하이라이트 */
  H: '#FFC48A',
  /** 물방울 바디 */
  I: '#7ED7F0',
  /** 물방울 하이라이트 */
  F: '#D7F6FF',
  /** 물방울 배 노란빛 */
  N: '#FFF3C0',
};

/**
 * `.` 빈칸, 그 외 문자는 COLOR 맵.
 * 가치고치 성장: egg(알) → sprout(새싹) → buddy(성장) → gachi(완전체 귤캐릭)
 * tree는 섬 장식용.
 */
export const PATTERNS: Record<PixelSpriteId, string[]> = {
  // 알 — 크림색 + 주황 점 + 꼭대기 새싹
  egg: [
    '....GG....',
    '...GLG....',
    '..EEEEE...',
    '.EEOEEEE..',
    '.EEEEEEE..',
    'EEOEEEEOE.',
    'EEEEEEEEE.',
    '.EEOEEEE..',
    '..EEEEE...',
    '..........',
  ],
  // 새싹 — 작은 귤 + 큰 새싹 (부화 직후)
  sprout: [
    '...GGG....',
    '..GLGLG...',
    '...LLL....',
    '..OOOOO...',
    '.OWOWOOO..',
    '.OPOPOOO..',
    '.OOOOOOO..',
    '..O...O...',
    '..O...O...',
    '..........',
  ],
  // 성장 — 귤 캐릭터 (팔·다리, 미소)
  buddy: [
    '....GG....',
    '...GLG....',
    '..OOOOO...',
    '.OHWWHOO..',
    '.OKW.WKO..',
    '.OPOOOPO..',
    '.OOMMMOO..',
    'O.OOOOO.O.',
    '..OOOOO...',
    '..O...O...',
  ],
  // 완전체 가치고치 — 앱 마스코트(귤) 도트화
  gachi: [
    '.....GG.....',
    '....GLG.....',
    '...OOOOOO...',
    '..OHHWWHOO..',
    '.OOKW.WKKOO.',
    '.OOPO.OPOOO.',
    '.OOOOMMMOOO.',
    'O..OOOOOO..O',
    '.O.OOOOOO.O.',
    '...OOOOOO...',
    '...OO..OO...',
    '..OO....OO..',
  ],
  // 섬 장식용 나무 (캐릭터 아님)
  tree: ['..DDDD..', '.DGGGGD.', 'DGGGGGGD', '..BBBB..', '...BB...', '...BB...'],
  house: ['.KKKKKK.', 'KOOOOOOK', 'KOWWWWOOK', 'KOWKKWOOK', 'KOWWWWOOK', 'KKKKKKKK'],
  pebble: ['........', '..AAA...', '.AWWWA..', '.AAAAA..', '..AAA...', '........'],
  canola: ['...YY...', '..YYYY..', '.YYOOYY.', '...GG...', '...DD...', '...BB...'],
  island: ['........', '..GGGG..', '.GGSSGG.', 'GSSSSSSG', '.BBBBBB.', '........'],
  volcano: ['...AA...', '..AAAA..', '.AARRRA.', 'AARRRRAA', 'BBBBBBBB', 'BBBBBBBB'],
  'volcano-erupt': ['..ORO...', '.ORRRO..', 'ORRRRRO.', 'AARRRRAA', 'BBBBBBBB', 'BBBBBBBB'],
  tangerine: ['..OOOO..', '.OOOOO.', 'OOOOOOOO', '.OOOOO.', '..OOOO..', '........'],
  lock: ['..KKKK..', '.K....K.', '.KKKKKK.', '.KYYYYK.', '.KKKKKK.', '........'],
  seed: ['........', '...BB...', '..BYYB..', '...BB...', '........', '........'],
};
