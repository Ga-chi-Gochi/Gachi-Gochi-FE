import type { PixelSpriteId } from '@/constants/pixel-assets';

/**
 * 고치 알 도감 카탈로그.
 * 인벤토리·탐험 보상에서 사용. 별도 도감 화면은 이 상수를 import 해 확장하면 됩니다.
 */
export type GochiEggRarity = 'common' | 'uncommon' | 'rare';

export type GochiEggDef = {
  id: string;
  name: string;
  detail: string;
  sprite: PixelSpriteId;
  rarity: GochiEggRarity;
  /** 획득 경로 표기 */
  source: string;
  /** 탐험 드롭 가중치 */
  weight: number;
};

export const GOCHI_EGGS: GochiEggDef[] = [
  {
    id: 'sprout-egg',
    name: '새싹 알',
    detail: '따뜻한 흙내음이 나는 알. 곧 잎이 돋을 것 같아요.',
    sprite: 'egg',
    rarity: 'common',
    source: '서쪽 숲 탐험',
    weight: 40,
  },
  {
    id: 'dew-egg',
    name: '이슬 알',
    detail: '아침 이슬처럼 반짝여요. 만지면 차가워요.',
    sprite: 'seed',
    rarity: 'common',
    source: '서쪽 숲 탐험',
    weight: 30,
  },
  {
    id: 'forest-egg',
    name: '숲빛 알',
    detail: '나뭇잎 무늬가 어른거리는 신비한 알이에요.',
    sprite: 'egg',
    rarity: 'uncommon',
    source: '서쪽 숲 탐험',
    weight: 20,
  },
  {
    id: 'star-egg',
    name: '별똥 알',
    detail: '밤하늘 조각을 품은 듯한 희귀한 알이에요.',
    sprite: 'egg',
    rarity: 'rare',
    source: '서쪽 숲 탐험',
    weight: 10,
  },
];

export const GOCHI_EGG_RARITY_LABEL: Record<GochiEggRarity, string> = {
  common: '흔함',
  uncommon: '조금 희귀',
  rare: '희귀',
};

export function getGochiEgg(id: string | null | undefined): GochiEggDef | undefined {
  if (!id) {
    return undefined;
  }
  return GOCHI_EGGS.find((egg) => egg.id === id);
}

/** 가중치 랜덤 드롭 */
export function pickRandomGochiEggId(random = Math.random): string {
  const total = GOCHI_EGGS.reduce((sum, egg) => sum + egg.weight, 0);
  let roll = random() * total;
  for (const egg of GOCHI_EGGS) {
    roll -= egg.weight;
    if (roll <= 0) {
      return egg.id;
    }
  }
  return GOCHI_EGGS[0]?.id ?? 'sprout-egg';
}

export function totalEggCount(eggs: Record<string, number>): number {
  return Object.values(eggs).reduce((sum, n) => sum + Math.max(0, n), 0);
}
