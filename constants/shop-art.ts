import type { ImageSource } from 'expo-image';

export const SHOP_ITEM_ART = {
  'deco-canola-flowers': require('@/assets/shop/deco-canola-flowers.png'),
  'deco-grass': require('@/assets/shop/deco-grass.png'),
  'deco-dol-hareubang': require('@/assets/shop/deco-dol-hareubang.png'),
  'deco-camellia-tree': require('@/assets/shop/deco-camellia-tree.png'),
  'deco-stone-wall': require('@/assets/shop/deco-stone-wall.png'),
  'icon-nest': require('@/assets/shop/icon-nest.png'),
  'icon-sunglasses': require('@/assets/shop/icon-sunglasses.png'),
  'icon-ribbon': require('@/assets/shop/icon-ribbon.png'),
  'icon-flower-tangerine': require('@/assets/shop/icon-flower-tangerine.png'),
  'icon-net': require('@/assets/shop/icon-net.png'),
} satisfies Record<string, ImageSource>;

export type ShopArtId = keyof typeof SHOP_ITEM_ART;

export type GyulsaeWearStage = 'egg' | 'young' | 'adult';

export const CHARACTER_WEAR: Record<string, Partial<Record<GyulsaeWearStage, ImageSource>>> = {
  nest: {
    egg: require('@/assets/shop/wear-nest-egg.png'),
    young: require('@/assets/shop/wear-nest-young.png'),
    adult: require('@/assets/shop/wear-nest-adult.png'),
  },
  sunglasses: {
    young: require('@/assets/shop/wear-sunglasses-young.png'),
    adult: require('@/assets/shop/wear-sunglasses-adult.png'),
  },
  ribbon: {
    egg: require('@/assets/shop/wear-ribbon-egg.png'),
    young: require('@/assets/shop/wear-ribbon-young.png'),
    adult: require('@/assets/shop/wear-ribbon-adult.png'),
  },
  'flower-tangerine': {
    egg: require('@/assets/shop/wear-flower-tangerine-egg.png'),
    young: require('@/assets/shop/wear-flower-tangerine-young.png'),
    adult: require('@/assets/shop/wear-flower-tangerine-adult.png'),
  },
  net: {
    egg: require('@/assets/shop/wear-net-egg.png'),
    young: require('@/assets/shop/wear-net-young.png'),
    adult: require('@/assets/shop/wear-net-adult.png'),
  },
};

export function isShopArtId(id: string): id is ShopArtId {
  return id in SHOP_ITEM_ART;
}

export function wearStageForLevel(level: number): GyulsaeWearStage {
  if (level <= 1) {
    return 'egg';
  }
  if (level >= 4) {
    return 'adult';
  }
  return 'young';
}
