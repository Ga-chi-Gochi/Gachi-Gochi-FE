import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Platform, View } from 'react-native';

import { PIXEL_ASSETS, type PixelSpriteId } from '@/constants/pixel-assets';
import { COLOR, PATTERNS } from '@/constants/pixel-patterns';
import { pixel } from '@/constants/pixel-theme';

/** 웹에서 귤새 이미지를 확대할 때 픽셀이 흐려지지 않게 */
const pixelImageStyle =
  Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

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
    return (
      <Image
        source={asset}
        style={{ width: size, height: size, ...pixelImageStyle }}
        contentFit="contain"
      />
    );
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
        <Image source={asset} style={{ width: size, height: size, ...pixelImageStyle }} contentFit="contain" />
      ) : (
        <DotGrid rows={rows} size={size} />
      )}
    </View>
  );
}
