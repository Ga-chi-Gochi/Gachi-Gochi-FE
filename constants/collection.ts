import type { ImageSource } from 'expo-image';

import { pixel } from '@/constants/pixel-theme';

export type CollectionStage = 'egg' | 'juvenile' | 'adult';

export type CollectionTag = '귤밭' | '오름' | '바다';

export type CollectionEntry = {
  no: number;
  species: string;
  name: string;
  stage: CollectionStage;
  tags: CollectionTag[];
  description: string;
  howToGet: string;
  image: ImageSource | null;
};

export type CollectionSort = 'no-asc' | 'no-desc' | 'found-first';

export const COLLECTION_STAGE_ORDER: CollectionStage[] = ['egg', 'juvenile', 'adult'];

export const COLLECTION_TAG_COLOR: Record<CollectionTag, string> = {
  귤밭: pixel.tangerine,
  오름: pixel.grassDeep,
  바다: pixel.sea,
};

export const COLLECTION_ENTRIES: CollectionEntry[] = [
  {
    no: 1,
    species: 'gyulsae',
    name: '귤새 (알)',
    stage: 'egg',
    tags: ['귤밭'],
    description: '귤밭 흙 속에서 따뜻하게 데워진 귤빛 알이에요. 껍질 위로 작은 새싹이 자라고 있어요.',
    howToGet: '탐험을 하다 보면 귤밭에서 귤새 알을 발견할 수 있어요.',
    image: require('@/assets/pixel/gyulsae-egg.png'),
  },
  {
    no: 2,
    species: 'gyulsae',
    name: '귤새 (소년기)',
    stage: 'juvenile',
    tags: ['귤밭', '오름'],
    description: '막 껍질을 깨고 나온 어린 귤새예요. 오름을 오르내리며 날갯짓을 연습해요.',
    howToGet: '걷기·봉그깅 같은 활동으로 알을 키워 부화시켜요.',
    image: require('@/assets/pixel/gyulsae-juvenile.png'),
  },
  {
    no: 3,
    species: 'gyulsae',
    name: '귤새 (성년기)',
    stage: 'adult',
    tags: ['귤밭', '바다'],
    description: '바닷바람을 타고 섬 곳곳을 날아다니는 어른 귤새예요.',
    howToGet: '소년기 귤새를 꾸준한 활동으로 끝까지 키워요.',
    image: require('@/assets/pixel/gyulsae-adult.png'),
  },
];

export const CURRENT_COLLECTION_STAGE: Partial<Record<string, CollectionStage>> = {
  gyulsae: 'egg',
};

export const COLLECTION_SORT_OPTIONS: { value: CollectionSort; label: string }[] = [
  { value: 'no-asc', label: '도감번호 순' },
  { value: 'no-desc', label: '도감번호 반대 순' },
  { value: 'found-first', label: '획득한 것 먼저' },
];

export const COLLECTION_HELP_TEXT =
  '탐험으로 알을 얻고, 걷기·봉그깅 같은 활동으로 고치를 키워요. 새로 만난 고치는 도감에 기록돼요.';

export function isCollectionDiscovered(entry: CollectionEntry): boolean {
  const current = CURRENT_COLLECTION_STAGE[entry.species];
  if (!current) {
    return false;
  }
  return COLLECTION_STAGE_ORDER.indexOf(entry.stage) <= COLLECTION_STAGE_ORDER.indexOf(current);
}

export function isCollectionCurrent(entry: CollectionEntry): boolean {
  return CURRENT_COLLECTION_STAGE[entry.species] === entry.stage;
}

export function formatCollectionNo(no: number): string {
  return `No.${String(no).padStart(3, '0')}`;
}

export function sortCollection(entries: CollectionEntry[], sort: CollectionSort): CollectionEntry[] {
  const sorted = [...entries].sort((a, b) => a.no - b.no);
  if (sort === 'no-desc') {
    return sorted.reverse();
  }
  if (sort === 'found-first') {
    return sorted.sort((a, b) => Number(isCollectionDiscovered(b)) - Number(isCollectionDiscovered(a)));
  }
  return sorted;
}
