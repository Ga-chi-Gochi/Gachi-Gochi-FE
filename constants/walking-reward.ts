// 걷기 보상 이름. 기획이 바뀌면 여기만 고치면 화면·팝업 문구가 함께 바뀐다.
// (귤은 가치고치 세계의 화폐라서 걷기 보상이 아니다.)
export const WALKING_REWARD_LABELS = {
  oxygen: '산소방울',
  water: '물방울',
} as const;

export type WalkingDrops = { oxygen: number; water: number };

export type WalkingRewardTier = WalkingDrops & { steps: number };

// 걸음 수 단계별 보상. 개수는 기획 확정 전 임시값이다.
export const WALKING_REWARD_TIERS: WalkingRewardTier[] = [
  { steps: 1000, oxygen: 3, water: 2 },
  { steps: 3000, oxygen: 5, water: 3 },
  { steps: 5000, oxygen: 8, water: 5 },
];
