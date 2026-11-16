export type WalkingDrops = { oxygen: number; water: number };

export type WalkingReward = { coins: number; xp: number };

export type WalkingRewardTier = WalkingReward & { steps: number };

export const WALKING_REWARD_COINS = 10;
export const WALKING_REWARD_XP = 5;
export const WALKING_GOAL_STEPS = 10000;

export const WALKING_REWARD_TIERS: WalkingRewardTier[] = [1000, 3000, 5000].map((steps) => ({
  steps,
  coins: WALKING_REWARD_COINS,
  xp: WALKING_REWARD_XP,
}));
