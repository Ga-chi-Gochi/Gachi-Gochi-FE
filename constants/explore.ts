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

/** 모험에서 고른 고치 → 숲 탐험 애니 캐릭터 */
export function exploreForestCharacter(
  id: string | null | undefined,
): 'adult' | 'juvenile' {
  return exploreGochiLevel(id) >= 4 ? 'adult' : 'juvenile';
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
  /** 갈 수 있는 최대 코스 시간. null이면 제한 없음 */
  maxHours: number | null;
};

/**
 * 모험에 내보낼 수 있는 고치 종류 카탈로그.
 * 실제 선택지는 `ownedExploreCharacterIds` — 보유한 종류만.
 */
export const EXPLORE_CHARACTERS: ExploreCharacter[] = [
  {
    id: 'egg',
    name: '알',
    detail: '부화 전엔 못 가요',
    icon: uiCharacter.egg,
    maxHours: null,
  },
  {
    id: 'young',
    name: '어린 귤새',
    detail: '2시간 코스까지',
    icon: uiCharacter.young,
    maxHours: 2,
  },
  {
    id: 'adult',
    name: '어른 귤새',
    detail: '모든 코스 가능',
    icon: uiCharacter.adult,
    maxHours: null,
  },
];

export function getExploreCharacter(id: ExploreCharacterId | null | undefined): ExploreCharacter | undefined {
  if (!id) {
    return undefined;
  }
  return EXPLORE_CHARACTERS.find((entry) => entry.id === id);
}

/**
 * 지금 키우는 고치 → 보유 종류 한 가지.
 * (레벨로 young·adult를 같이 여는 게 아니라, 현재 형태만 보유로 본다)
 * 알은 모험 불가 → 빈 목록.
 */
export function ownedExploreCharacterIds(growthLevel: number): ExploreCharacterId[] {
  if (growthLevel >= 4) {
    return ['adult'];
  }
  if (growthLevel >= 2) {
    return ['young'];
  }
  return [];
}

/** @deprecated ownedExploreCharacterIds 사용 */
export function exploreCharacterIdForGrowthLevel(growthLevel: number): ExploreCharacterId | null {
  return ownedExploreCharacterIds(growthLevel)[0] ?? null;
}

/** 보유 여부 */
export function ownsExploreCharacter(
  characterId: ExploreCharacterId,
  ownedIds: readonly ExploreCharacterId[],
): boolean {
  return characterId !== 'egg' && ownedIds.includes(characterId);
}

/** 보유 종류 + 코스 시간에 따라 보낼 수 있는지 */
export function canSendExploreCharacter(
  character: ExploreCharacter,
  ownedIds: readonly ExploreCharacterId[],
  courseHours: number,
): boolean {
  if (!ownsExploreCharacter(character.id, ownedIds)) {
    return false;
  }
  if (character.maxHours != null && courseHours > character.maxHours) {
    return false;
  }
  return true;
}

/** 잠금·불가 사유 — UI 보조 문구 */
export function exploreCharacterLockReason(
  character: ExploreCharacter,
  ownedIds: readonly ExploreCharacterId[],
  courseHours: number,
): string | null {
  if (character.id === 'egg' || !ownsExploreCharacter(character.id, ownedIds)) {
    return '아직 없어요';
  }
  if (character.maxHours != null && courseHours > character.maxHours) {
    return `${character.maxHours}시간 코스까지`;
  }
  return null;
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
