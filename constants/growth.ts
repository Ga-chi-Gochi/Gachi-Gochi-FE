/**
 * 캐릭터 성장 — 누적 XP만 본다. (물방울은 쓰지 않는다)
 * MVP용으로 낮춘 임시 임계값: 6 / 24 / 48
 */

/** HUD 통합 XP 바 만렙 기준 (= 섬 마지막 해금). MVP 임시값 */
export const OVERALL_XP_CAP = 90;

export type GrowthStage = {
  level: number;
  label: string;
  /** 이 레벨이 되려면 필요한 누적 XP */
  minXp: number;
};

/** 높은 레벨부터 검사한다 */
const GROWTH_STAGES: GrowthStage[] = [
  { minXp: 48, level: 4, label: '가치고치' },
  { minXp: 24, level: 3, label: '성장' },
  { minXp: 6, level: 2, label: '새싹' },
  { minXp: 0, level: 1, label: '알' },
];

export function getGrowthStageByLevel(level: number): GrowthStage {
  return GROWTH_STAGES.find((entry) => entry.level === level) ?? GROWTH_STAGES[GROWTH_STAGES.length - 1];
}

export function getGrowthStage(xp = 0): GrowthStage {
  const safe = Math.max(0, xp);
  return GROWTH_STAGES.find((entry) => safe >= entry.minXp) ?? GROWTH_STAGES[GROWTH_STAGES.length - 1];
}

/** HUD용 통합 XP 진행 비율 (0~1) */
export function getOverallXpRatio(xp: number): number {
  return Math.min(1, Math.max(0, Math.max(0, xp) / OVERALL_XP_CAP));
}

/** 지금 레벨 구간에서의 진행 비율 (0~1). 만렙이면 1 */
export function getCreatureXpRatio(xp: number): number {
  const safe = Math.max(0, xp);
  const current = getGrowthStage(safe);
  const next = GROWTH_STAGES.find((entry) => entry.level === current.level + 1);
  if (!next) {
    return 1;
  }
  const span = next.minXp - current.minXp;
  if (span <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, (safe - current.minXp) / span));
}

/** 다음 캐릭터 레벨까지 필요한 XP. 이미 만렙이면 0 */
export function xpToReachLevel(level: number, xp: number): number {
  const stage = GROWTH_STAGES.find((entry) => entry.level === level);
  if (!stage) {
    return 0;
  }
  return Math.max(0, stage.minXp - Math.max(0, xp));
}

/** 다음 성장 단계의 minXp. 만렙이면 null */
export function getNextGrowthMinXp(xp: number): number | null {
  const current = getGrowthStage(xp);
  const next = GROWTH_STAGES.find((entry) => entry.level === current.level + 1);
  return next?.minXp ?? null;
}

export function getGrowthRevealCopy(from: GrowthStage, to: GrowthStage): { title: string; body: string } {
  if (from.level === 1 && to.level >= 2) {
    return {
      title: '알이 부화했어요!',
      body: `${to.label} 단계로 깨어났어요. 봉그깅하고 걸으면서 더 키워 보세요.`,
    };
  }
  return {
    title: `${to.label}(으)로 자랐어요!`,
    body: `Lv.${from.level} → Lv.${to.level}. 경험치가 쌓여 성장했어요.`,
  };
}
