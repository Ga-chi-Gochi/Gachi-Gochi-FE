import { XP_TO_PROGRESS_DIVISOR } from '@/constants/creature-interaction';

// 물방울 + XP 기준 성장 단계. 기획 확정 전 임시값이다.
export type GrowthStage = {
  level: number;
  label: string;
};

const GROWTH_STAGES: { minProgress: number; level: number; label: string }[] = [
  { minProgress: 30, level: 4, label: '가치고치' },
  { minProgress: 15, level: 3, label: '성장' },
  { minProgress: 5, level: 2, label: '새싹' },
  { minProgress: 0, level: 1, label: '알' },
];

/** 물방울 + XP를 progress로 합친다. (추후 수정 예정) */
export function getGrowthProgress(water: number, xp: number): number {
  return Math.max(0, water) + Math.floor(Math.max(0, xp) / XP_TO_PROGRESS_DIVISOR);
}

export function getGrowthStage(water: number, xp = 0): GrowthStage {
  const progress = getGrowthProgress(water, xp);
  const stage = GROWTH_STAGES.find((entry) => progress >= entry.minProgress) ?? GROWTH_STAGES[GROWTH_STAGES.length - 1];
  return { level: stage.level, label: stage.label };
}

export function getGrowthRevealCopy(from: GrowthStage, to: GrowthStage): { title: string; body: string } {
  if (from.level === 1 && to.level >= 2) {
    return {
      title: '알이 부화했어요!',
      body: `${to.label} 단계로 깨어났어요. 계속 쓰다듬고 키워 주세요.`,
    };
  }
  return {
    title: `${to.label}(으)로 자랐어요!`,
    body: `Lv.${from.level} → Lv.${to.level}. 물방울과 쓰다듬기 경험치가 쌓였어요.`,
  };
}
