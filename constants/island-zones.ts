/** Sprout Lands 풍 섬 단계. 기디 에셋 오면 레이아웃만 유지하고 스프라이트 교체. */

export type IslandZoneId = 'core' | 'east' | 'west' | 'north' | 'south';

export type IslandZone = {
  id: IslandZoneId;
  name: string;
  detail: string;
  /** 섬 단계 (1~5). core=1 */
  stage: number;
  unlockXp: number;
  minLevel: number;
  /** 맵 위 상대 위치 (0~1). 값이 가까울수록 땅이 겹쳐 하나로 보임 */
  anchor: { x: number; y: number };
  /** 땅 덩어리 크기 배율 */
  size: number;
  volcanoBurst?: boolean;
};

export const ISLAND_ZONES: IslandZone[] = [
  {
    id: 'core',
    name: '중앙 섬',
    detail: '가치고치가 사는 기본 섬',
    stage: 1,
    unlockXp: 0,
    minLevel: 1,
    anchor: { x: 0.5, y: 0.54 },
    size: 1,
  },
  {
    id: 'east',
    name: '동쪽 해안',
    detail: '화산이 식으며 이어진 새 땅',
    stage: 2,
    unlockXp: 9,
    minLevel: 2,
    anchor: { x: 0.68, y: 0.54 },
    size: 0.78,
    volcanoBurst: true,
  },
  {
    id: 'west',
    name: '서쪽 숲',
    detail: '나무를 심기 좋은 구역',
    stage: 3,
    unlockXp: 18,
    minLevel: 2,
    anchor: { x: 0.32, y: 0.52 },
    size: 0.74,
  },
  {
    id: 'north',
    name: '북쪽 화산',
    detail: '화산 기슭이 섬에 붙었어요',
    stage: 4,
    unlockXp: 30,
    minLevel: 3,
    anchor: { x: 0.5, y: 0.34 },
    size: 0.82,
    volcanoBurst: true,
  },
  {
    id: 'south',
    name: '남쪽 들판',
    detail: '가장 넓은 들판이 열렸어요',
    stage: 5,
    unlockXp: 45,
    minLevel: 3,
    anchor: { x: 0.5, y: 0.72 },
    size: 0.8,
  },
];

export const ISLAND_STAGE_MAX = ISLAND_ZONES.length;

export function getZone(id: IslandZoneId): IslandZone | undefined {
  return ISLAND_ZONES.find((zone) => zone.id === id);
}

export function getIslandStage(unlocked: IslandZoneId[]): number {
  const stages = unlocked
    .map((id) => getZone(id)?.stage ?? 1)
    .filter((stage) => stage > 0);
  return stages.length === 0 ? 1 : Math.max(...stages);
}

export function getNextExpandZone(unlocked: IslandZoneId[]): IslandZone | null {
  const stage = getIslandStage(unlocked);
  return ISLAND_ZONES.find((zone) => zone.stage === stage + 1) ?? null;
}

export function canExpandIsland(unlocked: IslandZoneId[], xp: number, level: number): boolean {
  const next = getNextExpandZone(unlocked);
  if (!next) {
    return false;
  }
  return xp >= next.unlockXp && level >= next.minLevel;
}

export function getUnlockableZones(xp: number, unlocked: IslandZoneId[]): IslandZone[] {
  return ISLAND_ZONES.filter((zone) => xp >= zone.unlockXp && !unlocked.includes(zone.id));
}
