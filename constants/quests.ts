import type { Href } from 'expo-router';

export type Quest = {
  id: string;
  title: string;
  detail: string;
  reward: string;
  href: Href;
  done?: boolean;
};

export const dailyQuests: Quest[] = [
  {
    id: 'walk',
    title: '오늘의 걷기',
    detail: '걸어서 산소방울과 물방울을 모아요.',
    reward: '산소 · 물방울',
    href: '/walking',
  },
  {
    id: 'bongging',
    title: '쓰레기 줍기',
    detail: '근처 쓰레기를 주워 섬을 깨끗하게 해요.',
    reward: '경험치 · 섬 성장',
    href: '/camera',
  },
  {
    id: 'local-shop',
    title: '로컬 상점 방문',
    detail: '동네 상점에 들러 단골을 쌓아요.',
    reward: '귤 · 단골',
    href: '/store',
  },
  {
    id: 'special',
    title: '오늘의 스페셜 퀘스트',
    detail: '가치고치와 짧은 산책을 다녀와요.',
    reward: '치장 아이템',
    href: '/stroll',
  },
];
