import type { PixelSpriteId } from '@/constants/pixel-assets';
import type { ShopArtId } from '@/constants/shop-art';

export type ShopItemKind = 'island' | 'character';

export type ShopItem = {
  id: string;
  kind: ShopItemKind;
  name: string;
  price: number;
  detail: string;
  sprite: PixelSpriteId | ShopArtId;
  /** 심을 수 있는 기본 구역 힌트 */
  preferredZone?: 'core' | 'east' | 'west' | 'north' | 'south';
};

export const SHOP_ITEM_PRICE = 5;

export const shopItems: ShopItem[] = [
  {
    id: 'deco-canola-flowers',
    kind: 'island',
    name: '유채꽃',
    price: SHOP_ITEM_PRICE,
    detail: '봄 들판을 노랗게 물들이는 유채꽃이우다. 심어 두면 귤새가 꽃 사이로 아장아장 걸어다녀마씸.',
    sprite: 'deco-canola-flowers',
    preferredZone: 'south',
  },
  {
    id: 'deco-grass',
    kind: 'island',
    name: '풀숲',
    price: SHOP_ITEM_PRICE,
    detail: '바닷바람에 살랑이는 초록 풀숲이우다. 귤새가 낮잠 자기 좋은 폭신한 자리우다.',
    sprite: 'deco-grass',
    preferredZone: 'west',
  },
  {
    id: 'deco-dol-hareubang',
    kind: 'island',
    name: '돌하르방',
    price: SHOP_ITEM_PRICE,
    detail: '제주를 지켜 온 돌하르방이우다. 섬 입구에 세워 두면 귤새를 든든하게 지켜줘마씸.',
    sprite: 'deco-dol-hareubang',
    preferredZone: 'core',
  },
  {
    id: 'deco-camellia-tree',
    kind: 'island',
    name: '동백나무',
    price: SHOP_ITEM_PRICE,
    detail: '겨울에도 빨간 꽃을 피우는 동백나무우다. 추운 날에도 섬을 환하게 밝혀줘마씸.',
    sprite: 'deco-camellia-tree',
    preferredZone: 'north',
  },
  {
    id: 'deco-stone-wall',
    kind: 'island',
    name: '돌담',
    price: SHOP_ITEM_PRICE,
    detail: '구멍 숭숭 현무암을 쌓은 돌담이우다. 바람은 통하고 섬은 아늑하게 감싸줘마씸.',
    sprite: 'deco-stone-wall',
    preferredZone: 'east',
  },
  {
    id: 'nest',
    kind: 'character',
    name: '포근 둥지',
    price: SHOP_ITEM_PRICE,
    detail: '나뭇가지를 엮어 만든 포근한 둥지우다. 귤새가 쏙 들어가 쉬면 마음까지 따뜻해져마씸.',
    sprite: 'icon-nest',
  },
  {
    id: 'sunglasses',
    kind: 'character',
    name: '멋쟁이 선글라스',
    price: SHOP_ITEM_PRICE,
    detail: '제주 햇살도 문제없는 까만 선글라스우다. 쓰는 순간 귤새가 섬에서 제일 멋쟁이가 돼마씸.',
    sprite: 'icon-sunglasses',
  },
  {
    id: 'ribbon',
    kind: 'character',
    name: '분홍 리본',
    price: SHOP_ITEM_PRICE,
    detail: '말랑말랑 분홍 리본이우다. 머리에 달면 귤새가 한층 더 사랑스러워져마씸.',
    sprite: 'icon-ribbon',
  },
  {
    id: 'flower-tangerine',
    kind: 'character',
    name: '귤꽃 장식',
    price: SHOP_ITEM_PRICE,
    detail: '오월 귤밭에 피는 하얀 귤꽃이우다. 머리에 꽂으면 은은한 귤꽃 향이 나마씸.',
    sprite: 'icon-flower-tangerine',
  },
  {
    id: 'net',
    kind: 'character',
    name: '귤망 모자',
    price: SHOP_ITEM_PRICE,
    detail: '귤을 담던 주황 귤망을 모자로 썼수다! 귤새가 진짜 귤처럼 보이는 제주 패션이우다.',
    sprite: 'icon-net',
  },
];

export const retiredShopItems: ShopItem[] = [
  {
    id: 'house',
    kind: 'island',
    name: '돌담집',
    price: 80,
    detail: '섬에 올려 두는 작은 집이야.',
    sprite: 'house',
    preferredZone: 'core',
  },
  {
    id: 'egg',
    kind: 'island',
    name: '씨앗 알',
    price: 40,
    detail: '서쪽 숲에 심으면 친구가 자랄지도.',
    sprite: 'seed',
    preferredZone: 'west',
  },
  {
    id: 'pebble',
    kind: 'island',
    name: '조약돌 길',
    price: 25,
    detail: '섬 길을 반짝이게 꾸며 줘.',
    sprite: 'pebble',
    preferredZone: 'east',
  },
  {
    id: 'canola',
    kind: 'island',
    name: '유채 화분',
    price: 35,
    detail: '노란 꽃으로 섬 분위기를 밝혀 줘.',
    sprite: 'canola',
    preferredZone: 'south',
  },
];

export function getShopItem(id: string): ShopItem | undefined {
  return shopItems.find((item) => item.id === id) ?? retiredShopItems.find((item) => item.id === id);
}

export function getOwnedIslandItems(owned: string[]): ShopItem[] {
  return [...shopItems, ...retiredShopItems].filter((item) => item.kind === 'island' && owned.includes(item.id));
}
