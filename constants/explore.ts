import type { IslandZoneId } from '@/constants/island-zones';

/** 탐험 가능한 숲 구역 — 섬 확장으로 west가 열리면 해제 */
export const EXPLORE_FOREST_ZONE: IslandZoneId = 'west';

/** 하루 탐험 가능 횟수 (다마고치형 하루 루틴) */
export const EXPLORE_DAILY_LIMIT = 3;

/** 탐험 소요 시간(ms) — 지금은 테스트용 3초. 이후 밸런스 조정 */
export const EXPLORE_DURATION_MS = 3 * 1000;

export function formatExploreRemain(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
