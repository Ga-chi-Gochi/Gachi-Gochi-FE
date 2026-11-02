import type { PixelSpriteId } from '@/constants/pixel-assets';
import type { IslandZoneId } from '@/constants/island-zones';

/** 탐험 가능한 숲 구역 — 섬 확장으로 west가 열리면 해제 */
export const EXPLORE_FOREST_ZONE: IslandZoneId = 'west';

/** 하루 탐험 가능 횟수 (다마고치형 하루 루틴) */
export const EXPLORE_DAILY_LIMIT = 3;

/** 탐험 소요 시간(ms) — 지금은 테스트용 3초. 이후 밸런스 조정 */
export const EXPLORE_DURATION_MS = 3 * 1000;

/** 목 고치 — 이후 실제 보유 고치 목록으로 교체 */
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
];

export function getExploreGochi(id: string | null | undefined): ExploreGochi | undefined {
  if (!id) {
    return undefined;
  }
  return EXPLORE_MOCK_GOCHIS.find((gochi) => gochi.id === id);
}

/** 걷기 애니용 성장 레벨 매핑 (목 고치 id → GrowthCreatureSprite) */
export function exploreGochiLevel(id: string | null | undefined): number {
  switch (id) {
    case 'sprout':
      return 2;
    case 'buddy':
      return 3;
    case 'gachi':
      return 4;
    default:
      return 2;
  }
}

export function formatExploreRemain(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
