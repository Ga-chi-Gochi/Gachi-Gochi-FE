import { shopItems } from '@/constants/content';
import type { PixelSpriteId } from '@/constants/pixel-assets';

export type StoreTab = 'character' | 'island' | 'coin';
export type StorePreviewTab = Exclude<StoreTab, 'coin'>;

export const STORE_TABS: { id: StoreTab; label: string }[] = [
  { id: 'character', label: '캐릭터 꾸미기' },
  { id: 'island', label: '섬 꾸미기' },
  { id: 'coin', label: '귤코인 구매' },
];

type StoreItemMeta = {
  tab: StorePreviewTab;
  description: string;
};

export const storeItemMeta: Partial<Record<string, StoreItemMeta>> = {
  house: {
    tab: 'island',
    description: '제주 돌담으로 둘러싼 아담한 집이에요. 섬 한가운데에 두면 한층 아늑해져요.',
  },
  egg: {
    tab: 'island',
    description: '서쪽 숲에 심어 두면 새로운 친구가 자라날지도 몰라요.',
  },
  pebble: {
    tab: 'island',
    description: '반짝이는 조약돌로 섬 길을 꾸며요. 동쪽 해안과 잘 어울려요.',
  },
  canola: {
    tab: 'island',
    description: '제주의 봄을 닮은 노란 유채꽃 화분이에요. 남쪽 들판을 환하게 밝혀 줘요.',
  },
};

export type StoreProduct = {
  id: string;
  tab: StoreTab;
  kind: 'item' | 'coin';
  name: string;
  description: string;
  price: number;
  priceLabel: string;
  sprite?: PixelSpriteId;
};

const coinPackages: StoreProduct[] = [
  {
    id: 'coin-100',
    tab: 'coin',
    kind: 'coin',
    name: '귤 100개',
    description: '가볍게 꾸미기 좋은 귤 한 바구니예요.',
    price: 1200,
    priceLabel: '1,200원',
    sprite: 'tangerine',
  },
  {
    id: 'coin-300',
    tab: 'coin',
    kind: 'coin',
    name: '귤 300개',
    description: '섬과 캐릭터를 함께 꾸밀 수 있는 귤 상자예요.',
    price: 3300,
    priceLabel: '3,300원',
    sprite: 'tangerine',
  },
  {
    id: 'coin-1000',
    tab: 'coin',
    kind: 'coin',
    name: '귤 1000개',
    description: '귤밭 하나를 통째로! 넉넉하게 쓰고 싶을 때 좋아요.',
    price: 9900,
    priceLabel: '9,900원',
    sprite: 'tangerine',
  },
];

export function getStoreProducts(tab: StoreTab): StoreProduct[] {
  if (tab === 'coin') {
    return coinPackages;
  }
  return shopItems
    .map<StoreProduct>((item) => {
      const meta = storeItemMeta[item.id];
      return {
        id: item.id,
        tab: meta?.tab ?? 'island',
        kind: 'item',
        name: item.name,
        description: meta?.description ?? item.detail,
        price: item.price,
        priceLabel: `귤 ${item.price}개`,
        sprite: item.sprite,
      };
    })
    .filter((product) => product.tab === tab);
}
