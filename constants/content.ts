import type { ImageSource } from 'expo-image';

export type CreatureKind = '식물' | '물';

export type Creature = {
  id: string;
  name: string;
  kind: CreatureKind;
  story: string;
  image: ImageSource;
  found: boolean;
};

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  detail: string;
  image: ImageSource;
};

export type JournalEntry = {
  id: string;
  day: number;
  title: string;
  body: string;
};

export const mapImage = require('@/assets/figma/map.png') as ImageSource;
export const donggramiImage = require('@/assets/figma/donggrami.png') as ImageSource;
export const trashImage = require('@/assets/figma/trash.png') as ImageSource;
export const houseImage = require('@/assets/figma/house.png') as ImageSource;
export const eggImage = require('@/assets/figma/egg.png') as ImageSource;

export const creatures: Creature[] = [
  {
    id: 'orange',
    name: '귤이',
    kind: '식물',
    story: '마을 과수원에서 먼저 손을 흔드는 친구야.',
    image: require('@/assets/figma/orange.png'),
    found: true,
  },
  {
    id: 'drop',
    name: '방울이',
    kind: '물',
    story: '개울가에 앉으면 반짝이며 다가와.',
    image: require('@/assets/figma/drop.png'),
    found: true,
  },
  {
    id: 'flower',
    name: '하얀이',
    kind: '식물',
    story: '돌담 아래에서 조용히 피어 있어.',
    image: require('@/assets/figma/flower.png'),
    found: true,
  },
  {
    id: 'sunflower',
    name: '해바라',
    kind: '식물',
    story: '양지 바른 밭고랑을 지키고 있어.',
    image: require('@/assets/figma/sunflower.png'),
    found: true,
  },
];

export const lockedSlots = ['씨앗', '이끼', '조개', '돌멩이'];

export const shopItems: ShopItem[] = [
  {
    id: 'house',
    name: '돌담집',
    price: 80,
    detail: '조형을 끝내면 마을에 얹을 수 있는 집이야.',
    image: houseImage,
  },
  {
    id: 'egg',
    name: '씨앗 알',
    price: 40,
    detail: '도감에 새 친구를 하나 깨워.',
    image: eggImage,
  },
];

export const entries: JournalEntry[] = [
  {
    id: 'beach',
    day: 3,
    title: '해변 쓰레기',
    body: '병과 은박지를 주웠어. 동그라미가 조금 가벼워 보였어.',
  },
  {
    id: 'park',
    day: 1,
    title: '공원 길',
    body: '동그라미와 천천히 한 바퀴를 걸었어.',
  },
];
