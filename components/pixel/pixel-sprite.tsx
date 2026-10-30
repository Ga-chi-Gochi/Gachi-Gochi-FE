import { Image } from 'expo-image';
import { useMemo } from 'react';
import { View } from 'react-native';

import { PIXEL_ASSETS, type PixelSpriteId } from '@/constants/pixel-assets';
import { pixel } from '@/constants/pixel-theme';

const COLOR: Record<string, string> = {
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
const PATTERNS: Record<PixelSpriteId, string[]> = {
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

export type CreaturePose = 'idle' | 'walk-a' | 'walk-b';
export type CreatureFacing = 'left' | 'right';

type GrowthCreatureId = 'egg' | 'sprout' | 'buddy' | 'gachi';

/** 성장 캐릭터 전용 걷기/idle 프레임 (PATTERNS idle과 동일 비율) */
const CREATURE_POSES: Record<GrowthCreatureId, Record<CreaturePose, string[]>> = {
  egg: {
    idle: PATTERNS.egg,
    // 알은 다리 없이 통통 — 살짝 기울인 느낌의 프레임
    'walk-a': [
      '.....GG...',
      '....GLG...',
      '...EEEEE..',
      '..EEOEEEE.',
      '..EEEEEEE.',
      '.EEOEEEEOE',
      '.EEEEEEEEE',
      '..EEOEEEE.',
      '...EEEEE..',
      '..........',
    ],
    'walk-b': [
      '...GG.....',
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
  },
  sprout: {
    idle: PATTERNS.sprout,
    'walk-a': [
      '...GGG....',
      '..GLGLG...',
      '...LLL....',
      '..OOOOO...',
      '.OWOWOOO..',
      '.OPOPOOO..',
      'O.OOOOOO..',
      '..O.......',
      '....O.....',
      '..........',
    ],
    'walk-b': [
      '...GGG....',
      '..GLGLG...',
      '...LLL....',
      '..OOOOO...',
      '.OWOWOOO..',
      '.OPOPOOO..',
      '..OOOOOO.O',
      '.......O..',
      '.....O....',
      '..........',
    ],
  },
  buddy: {
    idle: PATTERNS.buddy,
    'walk-a': [
      '....GG....',
      '...GLG....',
      '..OOOOO...',
      '.OHWWHOO..',
      '.OKW.WKO..',
      '.OPOOOPO..',
      'O.OOMMMO..',
      '..OOOOO...',
      '..O.......',
      '....O.....',
    ],
    'walk-b': [
      '....GG....',
      '...GLG....',
      '..OOOOO...',
      '.OHWWHOO..',
      '.OKW.WKO..',
      '.OPOOOPO..',
      '..OOMMMO.O',
      '..OOOOO...',
      '.......O..',
      '.....O....',
    ],
  },
  gachi: {
    idle: PATTERNS.gachi,
    'walk-a': [
      '.....GG.....',
      '....GLG.....',
      '...OOOOOO...',
      '..OHHWWHOO..',
      '.OOKW.WKKOO.',
      '.OOPO.OPOOO.',
      'O.OOOOMMMOO.',
      '.O.OOOOOO...',
      '...OO.......',
      '.....OO.....',
      '......O.....',
      '............',
    ],
    'walk-b': [
      '.....GG.....',
      '....GLG.....',
      '...OOOOOO...',
      '..OHHWWHOO..',
      '.OOKW.WKKOO.',
      '.OOPO.OPOOO.',
      '.OOOOMMMOO.O',
      '...OOOOOO.O.',
      '.......OO...',
      '.....OO.....',
      '.....O......',
      '............',
    ],
  },
};

function DotGrid({ rows, size }: { rows: string[]; size: number }) {
  const cell = useMemo(() => Math.max(2, Math.floor(size / Math.max(rows[0]?.length || 8, 1))), [rows, size]);
  return (
    <View style={{ width: cell * (rows[0]?.length ?? 0), height: cell * rows.length }}>
      {rows.map((row, y) => (
        <View key={`dot-r-${y}`} style={{ flexDirection: 'row', height: cell }}>
          {row.split('').map((ch, x) => (
            <View
              key={`dot-${y}-${x}`}
              style={{
                width: cell,
                height: cell,
                backgroundColor: COLOR[ch] ?? pixel.ink,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

type PixelSpriteProps = {
  id: PixelSpriteId;
  size?: number;
};

export function PixelSprite({ id, size = 48 }: PixelSpriteProps) {
  const asset = PIXEL_ASSETS[id];
  const rows = PATTERNS[id];

  if (asset) {
    return <Image source={asset} style={{ width: size, height: size }} contentFit="contain" />;
  }

  return <DotGrid rows={rows} size={size} />;
}

export function growthSpriteId(level: number): GrowthCreatureId {
  if (level <= 1) return 'egg';
  if (level === 2) return 'sprout';
  if (level === 3) return 'buddy';
  return 'gachi';
}

/** 섬/쓰담용 — idle·걷기 프레임 + 좌우 반전 */
export function GrowthCreatureSprite({
  level,
  size = 48,
  pose = 'idle',
  facing = 'right',
}: {
  level: number;
  size?: number;
  pose?: CreaturePose;
  facing?: CreatureFacing;
}) {
  const id = growthSpriteId(level);
  const rows = CREATURE_POSES[id][pose];
  const asset = PIXEL_ASSETS[id];

  return (
    <View style={{ transform: [{ scaleX: facing === 'left' ? -1 : 1 }] }}>
      {asset ? (
        <Image source={asset} style={{ width: size, height: size }} contentFit="contain" />
      ) : (
        <DotGrid rows={rows} size={size} />
      )}
    </View>
  );
}
