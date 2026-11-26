import type { ImageSource } from 'expo-image';

import type { IslandZoneId } from '@/constants/island-zones';
import type { PixelSpriteId } from '@/constants/pixel-assets';
import { uiCharacter, uiExplore } from '@/constants/ui-assets';

/** 탐험 가능한 숲 구역 — 섬 확장으로 west가 열리면 해제 */
export const EXPLORE_FOREST_ZONE: IslandZoneId = 'west';

/** 하루 탐험 가능 횟수 (다마고치형 하루 루틴) */
export const EXPLORE_DAILY_LIMIT = 3;

/** 탐험 소요 시간(ms) — 지금은 테스트용 3초. 이후 밸런스 조정 */
export const EXPLORE_DURATION_MS = 3 * 1000;

/** 목 고치 — 하위 호환·대기 애니용 */
export type ExploreGochi = {
  id: string;
  name: string;
  detail: string;
  sprite: PixelSpriteId;
};

export const EXPLORE_MOCK_GOCHIS: ExploreGochi[] = [
  { id: 'sprout', name: '새싹이', detail: '호기심 많은 새싹 고치', sprite: 'sprout' },
  { id: 'buddy', name: '방울이', detail: '숲길을 잘 아는 방울 고치', sprite: 'buddy' },
  { id: 'gachi', name: '가치고치', detail: '믿음직한 탐험 리더', sprite: 'gachi' },
  { id: 'young', name: '어린 귤새', detail: '2시간 코스까지', sprite: 'sprout' },
  { id: 'adult', name: '어른 귤새', detail: '모든 코스 가능', sprite: 'gachi' },
];

export function getExploreGochi(id: string | null | undefined): ExploreGochi | undefined {
  if (!id) {
    return undefined;
  }
  return EXPLORE_MOCK_GOCHIS.find((gochi) => gochi.id === id);
}

/** 걷기 애니용 성장 레벨 매핑 */
export function exploreGochiLevel(id: string | null | undefined): number {
  switch (id) {
    case 'egg':
      return 1;
    case 'sprout':
    case 'young':
      return 2;
    case 'buddy':
      return 3;
    case 'gachi':
    case 'adult':
      return 4;
    default:
      return 2;
  }
}

export type ExploreCourseId = 'oreum' | 'camellia' | 'orchard';

export type ExploreCourse = {
  id: ExploreCourseId;
  name: string;
  /** 와프에 보이는 소요 시간(시간) */
  hours: number;
  /** MVP 테스트용 실제 타이머(ms). hours에 비례 */
  durationMs: number;
  eggChance: number;
  itemLabel: string;
  itemChance: number;
  icon: ImageSource;
};

/** 모험 코스 — 와프 1페이지 */
export const EXPLORE_COURSES: ExploreCourse[] = [
  {
    id: 'oreum',
    name: '작은 오름',
    hours: 2,
    durationMs: EXPLORE_DURATION_MS,
    eggChance: 15,
    itemLabel: '억새',
    itemChance: 85,
    icon: uiExplore.oreum,
  },
  {
    id: 'camellia',
    name: '동백 숲길',
    hours: 4,
    durationMs: EXPLORE_DURATION_MS * 2,
    eggChance: 25,
    itemLabel: '동백꽃',
    itemChance: 75,
    icon: uiExplore.camellia,
  },
  {
    id: 'orchard',
    name: '귤꽃 과수원',
    hours: 8,
    durationMs: EXPLORE_DURATION_MS * 4,
    eggChance: 40,
    itemLabel: '귤꽃',
    itemChance: 60,
    icon: uiExplore.orchard,
  },
];

export function getExploreCourse(id: ExploreCourseId | null | undefined): ExploreCourse | undefined {
  if (!id) {
    return undefined;
  }
  return EXPLORE_COURSES.find((course) => course.id === id);
}

export type ExploreCharacterId = 'egg' | 'young' | 'adult';

export type ExploreCharacter = {
  id: ExploreCharacterId;
  name: string;
  detail: string;
  icon: ImageSource;
  /** 이 성장 레벨 이상이면 선택 가능. egg는 항상 잠금 */
  minLevel: number;
  /** 갈 수 있는 최대 코스 시간. null이면 제한 없음 */
  maxHours: number | null;
};

/** 모험 캐릭터 — 와프 2페이지 */
export const EXPLORE_CHARACTERS: ExploreCharacter[] = [
  {
    id: 'egg',
    name: '알',
    detail: '부화 전엔 못 가요',
    icon: uiCharacter.egg,
    minLevel: 99,
    maxHours: null,
  },
  {
    id: 'young',
    name: '어린 귤새',
    detail: '2시간 코스까지',
    icon: uiCharacter.young,
    minLevel: 2,
    maxHours: 2,
  },
  {
    id: 'adult',
    name: '어른 귤새',
    detail: '모든 코스 가능',
    icon: uiCharacter.adult,
    minLevel: 3,
    maxHours: null,
  },
];

export function getExploreCharacter(id: ExploreCharacterId | null | undefined): ExploreCharacter | undefined {
  if (!id) {
    return undefined;
  }
  return EXPLORE_CHARACTERS.find((entry) => entry.id === id);
}

/** 성장 단계·코스 시간에 따라 캐릭터를 보낼 수 있는지 */
export function canSendExploreCharacter(
  character: ExploreCharacter,
  growthLevel: number,
  courseHours: number,
): boolean {
  if (character.id === 'egg') {
    return false;
  }
  if (growthLevel < character.minLevel) {
    return false;
  }
  if (character.maxHours != null && courseHours > character.maxHours) {
    return false;
  }
  return true;
}

export function formatExploreRemain(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 귀환 예정 시각 라벨 (와프 표시용 — 코스 hours 기준) */
export function formatExploreReturnLabel(hours: number, now = new Date()): string {
  const returnAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const h = returnAt.getHours();
  const m = returnAt.getMinutes();
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `귀환 예정 ${period} ${hour12}:${String(m).padStart(2, '0')}`;
}

/** 0~1 진행률. 시작/종료 시각이 없으면 0 */
export function exploreProgress(startedAt: number | null, endsAt: number | null, now = Date.now()): number {
  if (!startedAt || !endsAt || endsAt <= startedAt) {
    return 0;
  }
  if (now >= endsAt) {
    return 1;
  }
  if (now <= startedAt) {
    return 0;
  }
  return (now - startedAt) / (endsAt - startedAt);
}
