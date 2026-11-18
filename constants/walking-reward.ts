export type WalkingDrops = { oxygen: number; water: number };

export type WalkingReward = { coins: number; xp: number };

export type WalkingRewardGain = WalkingReward & { reachedGoal: boolean };

export type WalkingRewardTier = WalkingReward & { steps: number };

export const WALKING_REWARD_COINS = 10;
export const WALKING_REWARD_XP = 5;
export const WALKING_GOAL = 5000;

export const WALKING_REWARD_TIERS: WalkingRewardTier[] = [1000, 3000, WALKING_GOAL].map((steps) => ({
  steps,
  coins: WALKING_REWARD_COINS,
  xp: WALKING_REWARD_XP,
}));
