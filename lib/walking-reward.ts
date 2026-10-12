import AsyncStorage from '@react-native-async-storage/async-storage';

import { WALKING_REWARD_TIERS, type WalkingDrops, type WalkingRewardTier } from '@/constants/walking-reward';

const WALKING_REWARD_KEY = 'walking/reward';
const WALKING_INTRO_KEY = 'walking/intro-seen';

// 기기에 저장되는 걷기 보상 기록. 앱을 껐다 켜도 유지된다.
// [TODO: 실제 연동] 서버가 생기면 이 기록과 지급 판정을 서버로 옮긴다.
type WalkingRewardRecord = {
  // 보상을 받은 날짜(YYYY-MM-DD). 날짜가 바뀌면 claimedSteps를 비운다.
  date: string;
  // 그날 이미 보상을 받은 단계의 걸음 수 기준값.
  claimedSteps: number[];
  // 지금까지 모은 방울 수.
  drops: WalkingDrops;
};

export type WalkingRewardSnapshot = {
  claimedSteps: number[];
  drops: WalkingDrops;
};

export type WalkingRewardClaim = WalkingRewardSnapshot & {
  // 이번에 새로 지급된 보상. 없으면 null.
  reward: WalkingDrops | null;
};

// 저장소 읽기·쓰기를 한 줄로 세워서, 같은 단계가 동시에 두 번 지급되지 않게 한다.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

function todayKey(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

async function readRecord(): Promise<WalkingRewardRecord> {
  const today = todayKey();
  const empty: WalkingRewardRecord = { date: today, claimedSteps: [], drops: { oxygen: 0, water: 0 } };
  const raw = await AsyncStorage.getItem(WALKING_REWARD_KEY);
  if (!raw) {
    return empty;
  }
  try {
    const saved = JSON.parse(raw) as Partial<WalkingRewardRecord>;
    return {
      date: today,
      claimedSteps: saved.date === today && Array.isArray(saved.claimedSteps) ? saved.claimedSteps : [],
      drops: { oxygen: Number(saved.drops?.oxygen) || 0, water: Number(saved.drops?.water) || 0 },
    };
  } catch {
    return empty;
  }
}

function writeRecord(record: WalkingRewardRecord): Promise<void> {
  return AsyncStorage.setItem(WALKING_REWARD_KEY, JSON.stringify(record));
}

export function loadWalkingReward(): Promise<WalkingRewardSnapshot> {
  return enqueue(async () => {
    const { claimedSteps, drops } = await readRecord();
    return { claimedSteps, drops };
  });
}

// 오늘 걸음 수로 새로 달성한 단계가 있으면 지급하고 기록한다. 같은 날 같은 단계는 한 번만 지급한다.
export function claimWalkingRewards(steps: number): Promise<WalkingRewardClaim> {
  return enqueue(async () => {
    const record = await readRecord();
    const earned = WALKING_REWARD_TIERS.filter((tier) => steps >= tier.steps && !record.claimedSteps.includes(tier.steps));
    if (earned.length === 0) {
      return { claimedSteps: record.claimedSteps, drops: record.drops, reward: null };
    }
    const reward = sumDrops(earned);
    const next: WalkingRewardRecord = {
      date: record.date,
      claimedSteps: [...record.claimedSteps, ...earned.map((tier) => tier.steps)],
      drops: { oxygen: record.drops.oxygen + reward.oxygen, water: record.drops.water + reward.water },
    };
    await writeRecord(next);
    return { claimedSteps: next.claimedSteps, drops: next.drops, reward };
  });
}

// 개발용: 오늘 받은 단계 기록만 지운다. 이미 모은 방울 수는 그대로 둔다.
export function resetTodayWalkingClaims(): Promise<WalkingRewardSnapshot> {
  return enqueue(async () => {
    const record = await readRecord();
    await writeRecord({ ...record, claimedSteps: [] });
    return { claimedSteps: [], drops: record.drops };
  });
}

export async function hasSeenWalkingIntro(): Promise<boolean> {
  return (await AsyncStorage.getItem(WALKING_INTRO_KEY)) === 'true';
}

export function markWalkingIntroSeen(): Promise<void> {
  return AsyncStorage.setItem(WALKING_INTRO_KEY, 'true');
}

// [TODO: 성장 연결] 걷기 보상이 지급될 때마다 불린다. 나중에 산소방울(탄소 제거)·물방울(가치고치 성장)을
// 캐릭터·섬 성장 규칙으로 이어 붙일 자리다. 성장 규칙은 기획 확정 전이라 지금은 아무 일도 하지 않는다.
export function applyWalkingRewardToGrowth(reward: WalkingDrops): void {
  void reward;
}

// 다음에 받을 보상 단계. 모든 단계를 넘었으면 null.
export function nextWalkingTier(steps: number): WalkingRewardTier | null {
  return WALKING_REWARD_TIERS.find((tier) => steps < tier.steps) ?? null;
}

function sumDrops(tiers: WalkingRewardTier[]): WalkingDrops {
  return tiers.reduce<WalkingDrops>((sum, tier) => ({ oxygen: sum.oxygen + tier.oxygen, water: sum.water + tier.water }), { oxygen: 0, water: 0 });
}
