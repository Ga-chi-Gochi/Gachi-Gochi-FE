import type { ImageSource } from 'expo-image';

import type { GyulsaeWearStage, ShopArtId } from '@/constants/shop-art';

export const WEAR_ART_PIXELS = 32;

export const WEAR_HD: Record<string, Partial<Record<GyulsaeWearStage, ImageSource>>> = {
  nest: {
    egg: require('@/assets/ui/wear/nest-egg.png'),
    young: require('@/assets/ui/wear/nest-young.png'),
    adult: require('@/assets/ui/wear/nest-adult.png'),
  },
  sunglasses: {
    young: require('@/assets/ui/wear/sunglasses-young.png'),
    adult: require('@/assets/ui/wear/sunglasses-adult.png'),
  },
  ribbon: {
    egg: require('@/assets/ui/wear/ribbon-egg.png'),
    young: require('@/assets/ui/wear/ribbon-young.png'),
    adult: require('@/assets/ui/wear/ribbon-adult.png'),
  },
  'flower-tangerine': {
    egg: require('@/assets/ui/wear/flower-tangerine-v2-egg.png'),
    young: require('@/assets/ui/wear/flower-tangerine-v2-young.png'),
    adult: require('@/assets/ui/wear/flower-tangerine-v2-adult.png'),
  },
  net: {
    egg: require('@/assets/ui/wear/net-egg.png'),
    young: require('@/assets/ui/wear/net-young.png'),
    adult: require('@/assets/ui/wear/net-adult.png'),
  },
};

export const SHOP_ART_HD: Record<ShopArtId, ImageSource> = {
  'deco-canola-flowers': require('@/assets/ui/shop-hd/deco-canola-flowers.png'),
  'deco-grass': require('@/assets/ui/shop-hd/deco-grass.png'),
  'deco-dol-hareubang': require('@/assets/ui/shop-hd/deco-dol-hareubang.png'),
  'deco-camellia-tree': require('@/assets/ui/shop-hd/deco-camellia-tree.png'),
  'deco-stone-wall': require('@/assets/ui/shop-hd/deco-stone-wall.png'),
  'icon-nest': require('@/assets/ui/shop-hd/icon-nest.png'),
  'icon-sunglasses': require('@/assets/ui/shop-hd/icon-sunglasses.png'),
  'icon-ribbon': require('@/assets/ui/shop-hd/icon-ribbon.png'),
  'icon-flower-tangerine': require('@/assets/ui/shop-hd/icon-flower-tangerine.png'),
  'icon-net': require('@/assets/ui/shop-hd/icon-net.png'),
};
