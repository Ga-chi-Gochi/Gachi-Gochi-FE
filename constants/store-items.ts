import { shopItems, type ShopItem } from '@/constants/content';

export type StoreTab = 'character' | 'island' | 'coin';
export type StorePreviewTab = Exclude<StoreTab, 'coin'>;

export const STORE_TABS: { id: StoreTab; label: string }[] = [
  { id: 'character', label: '캐릭터 꾸미기' },
  { id: 'island', label: '섬 꾸미기' },
  { id: 'coin', label: '귤코인 구매' },
];

export type StoreProduct = {
  id: string;
  tab: StoreTab;
  kind: 'item' | 'coin';
  name: string;
  description: string;
  price: number;
  priceLabel: string;
  sprite?: ShopItem['sprite'];
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
    .filter((item) => item.kind === tab)
    .map<StoreProduct>((item) => ({
      id: item.id,
      tab: item.kind,
      kind: 'item',
      name: item.name,
      description: item.detail,
      price: item.price,
      priceLabel: `귤 ${item.price}개`,
      sprite: item.sprite,
    }));
}
