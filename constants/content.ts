import type { PixelSpriteId } from '@/constants/pixel-assets';

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  detail: string;
  sprite: PixelSpriteId;
  /** 심을 수 있는 기본 구역 힌트 */
  preferredZone?: 'core' | 'east' | 'west' | 'north' | 'south';
};

export const shopItems: ShopItem[] = [
  {
    id: 'house',
    name: '돌담집',
    price: 80,
    detail: '섬에 올려 두는 작은 집이야.',
    sprite: 'house',
    preferredZone: 'core',
  },
  {
    id: 'egg',
    name: '씨앗 알',
    price: 40,
    detail: '서쪽 숲에 심으면 친구가 자랄지도.',
    sprite: 'seed',
    preferredZone: 'west',
  },
  {
    id: 'pebble',
    name: '조약돌 길',
    price: 25,
    detail: '섬 길을 반짝이게 꾸며 줘.',
    sprite: 'pebble',
    preferredZone: 'east',
  },
  {
    id: 'canola',
    name: '유채 화분',
    price: 35,
    detail: '노란 꽃으로 섬 분위기를 밝혀 줘.',
    sprite: 'canola',
    preferredZone: 'south',
  },
];

export function getShopItem(id: string): ShopItem | undefined {
  return shopItems.find((item) => item.id === id);
}
