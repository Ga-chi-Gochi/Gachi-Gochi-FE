export type WalkingDrops = { oxygen: number; water: number };

export type WalkingReward = { coins: number; xp: number };

export type WalkingRewardGain = WalkingReward & { reachedGoal: boolean; topSteps: number };

export type WalkingRewardTier = WalkingReward & { steps: number };

export const WALKING_REWARD_COINS = 10;
export const WALKING_REWARD_XP = 5;
export const WALKING_STEP_INTERVAL = 2000;
export const WALKING_TIER_COUNT = 5;
export const WALKING_GOAL = WALKING_STEP_INTERVAL * WALKING_TIER_COUNT;

export const WALKING_REWARD_TIERS: WalkingRewardTier[] = Array.from({ length: WALKING_TIER_COUNT }, (_, index) => ({
  steps: WALKING_STEP_INTERVAL * (index + 1),
  coins: WALKING_REWARD_COINS,
  xp: WALKING_REWARD_XP,
}));
