import AsyncStorage from '@react-native-async-storage/async-storage';

import { EXPLORE_DAILY_LIMIT, EXPLORE_DURATION_MS } from '@/constants/explore';
import { pickRandomGochiEggId, totalEggCount } from '@/constants/gochi-eggs';

export const EXPLORE_STATE_KEY = 'explore/state';

export type ExploreStateRecord = {
  /** YYYY-MM-DD — 날짜가 바뀌면 remaining 리셋 */
  date: string;
  remaining: number;
  /** 탐험 시작 시각(epoch ms). 없으면 null */
  exploringStartedAt: number | null;
  /** 탐험 종료 시각(epoch ms). 없으면 null */
  exploringUntil: number | null;
  /** 파견 중인 고치 id */
  dispatchedGochiId: string | null;
  /** 타이머 종료 후 아직 안 받은 보상 (고치 id) */
  pendingRewardGochiId: string | null;
  /** 종류별 보유 수 — 도감/인벤 공용 */
  eggs: Record<string, number>;
  /** 상세를 아직 안 본 알 (NEW 뱃지) */
  newEggIds: string[];
  /** 하위 호환용 총합 (eggs 합과 동기화) */
  eggCount: number;
};

function todayKey(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function normalizeEggs(raw: unknown, legacyCount: number): Record<string, number> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const next: Record<string, number> = {};
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
      const n = Math.max(0, Math.floor(Number(value) || 0));
      if (n > 0 && id) {
        next[id] = n;
      }
    }
    if (Object.keys(next).length > 0) {
      return next;
    }
  }
  // 예전 eggCount만 있던 저장 → 기본 알로 이전
  if (legacyCount > 0) {
    return { 'sprout-egg': legacyCount };
  }
  return {};
}

function normalizeNewIds(raw: unknown, eggs: Record<string, number>): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((id): id is string => typeof id === 'string' && Boolean(eggs[id]));
}

function defaultRecord(now = new Date()): ExploreStateRecord {
  return {
    date: todayKey(now),
    remaining: EXPLORE_DAILY_LIMIT,
    exploringStartedAt: null,
    exploringUntil: null,
    dispatchedGochiId: null,
    pendingRewardGochiId: null,
    eggs: {},
    newEggIds: [],
    eggCount: 0,
  };
}

function normalize(saved: Partial<ExploreStateRecord> | null | undefined, now = new Date()): ExploreStateRecord {
  const today = todayKey(now);
  const date = typeof saved?.date === 'string' ? saved.date : today;
  const legacyCount = Math.max(0, Number(saved?.eggCount) || 0);
  const eggs = normalizeEggs(saved?.eggs, legacyCount);
  const newEggIds = normalizeNewIds(saved?.newEggIds, eggs);
  let pendingRewardGochiId =
    typeof saved?.pendingRewardGochiId === 'string' ? saved.pendingRewardGochiId : null;

  let exploringUntil: number | null =
    typeof saved?.exploringUntil === 'number' ? saved.exploringUntil : null;
  let exploringStartedAt =
    typeof saved?.exploringStartedAt === 'number' ? saved.exploringStartedAt : null;
  let dispatchedGochiId = typeof saved?.dispatchedGochiId === 'string' ? saved.dispatchedGochiId : null;

  if (exploringUntil != null && exploringUntil <= now.getTime()) {
    if (!pendingRewardGochiId && dispatchedGochiId) {
      pendingRewardGochiId = dispatchedGochiId;
    }
    exploringUntil = null;
    exploringStartedAt = null;
    dispatchedGochiId = null;
  } else if (exploringUntil == null) {
    exploringStartedAt = null;
    dispatchedGochiId = null;
  }

  const remainingBase =
    date !== today
      ? EXPLORE_DAILY_LIMIT
      : Math.max(0, Math.min(EXPLORE_DAILY_LIMIT, Number(saved?.remaining) || 0));

  return {
    date: date !== today ? today : date,
    remaining: remainingBase,
    exploringStartedAt: exploringUntil ? exploringStartedAt : null,
    exploringUntil,
    dispatchedGochiId: exploringUntil ? dispatchedGochiId : null,
    pendingRewardGochiId,
    eggs,
    newEggIds,
    eggCount: totalEggCount(eggs),
  };
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

async function readUnlocked(): Promise<ExploreStateRecord> {
  const raw = await AsyncStorage.getItem(EXPLORE_STATE_KEY);
  if (!raw) {
    return defaultRecord();
  }
  try {
    return normalize(JSON.parse(raw) as Partial<ExploreStateRecord>);
  } catch {
    return defaultRecord();
  }
}

async function writeUnlocked(next: ExploreStateRecord): Promise<ExploreStateRecord> {
  const record = normalize(next);
  await AsyncStorage.setItem(EXPLORE_STATE_KEY, JSON.stringify(record));
  return record;
}

export function readExploreState(): Promise<ExploreStateRecord> {
  return enqueue(readUnlocked);
}

export function writeExploreState(next: ExploreStateRecord): Promise<ExploreStateRecord> {
  return enqueue(() => writeUnlocked(next));
}

export type StartExploreTripInput = {
  gochiId: string;
};

export function startExploreTrip(input: StartExploreTripInput): Promise<ExploreStateRecord | null> {
  return enqueue(async () => {
    const current = await readUnlocked();
    const now = Date.now();
    if (current.pendingRewardGochiId) {
      return null;
    }
    if (current.exploringUntil && current.exploringUntil > now) {
      return null;
    }
    if (current.remaining <= 0) {
      return null;
    }
    if (!input.gochiId) {
      return null;
    }
    return writeUnlocked({
      ...current,
      remaining: current.remaining - 1,
      exploringStartedAt: now,
      exploringUntil: now + EXPLORE_DURATION_MS,
      dispatchedGochiId: input.gochiId,
    });
  });
}

export function completeExploreTripIfDone(): Promise<ExploreStateRecord> {
  return enqueue(async () => {
    const raw = await AsyncStorage.getItem(EXPLORE_STATE_KEY);
    let parsed: Partial<ExploreStateRecord> | null = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw) as Partial<ExploreStateRecord>;
      } catch {
        parsed = null;
      }
    }
    const now = Date.now();
    const expiredInStorage =
      typeof parsed?.exploringUntil === 'number' && parsed.exploringUntil <= now;
    const dayRolled =
      typeof parsed?.date === 'string' && parsed.date !== todayKey(new Date(now));

    const current = await readUnlocked();
    if (expiredInStorage || dayRolled) {
      return writeUnlocked(current);
    }
    return current;
  });
}

export type ClaimExploreRewardResult = {
  gochiId: string;
  eggId: string;
  eggCount: number;
  isNewType: boolean;
};

/** 보상 수령 — 랜덤 고치 알 +1 */
export function claimExploreReward(): Promise<ClaimExploreRewardResult | null> {
  return enqueue(async () => {
    const current = await readUnlocked();
    if (!current.pendingRewardGochiId) {
      return null;
    }
    const gochiId = current.pendingRewardGochiId;
    const eggId = pickRandomGochiEggId();
    const prev = current.eggs[eggId] ?? 0;
    const isNewType = prev <= 0;
    const eggs = { ...current.eggs, [eggId]: prev + 1 };
    const newEggIds = isNewType
      ? Array.from(new Set([...current.newEggIds, eggId]))
      : current.newEggIds;
    const eggCount = totalEggCount(eggs);
    await writeUnlocked({
      ...current,
      pendingRewardGochiId: null,
      eggs,
      newEggIds,
      eggCount,
    });
    return { gochiId, eggId, eggCount, isNewType };
  });
}

/** 상세 확인 → NEW 해제 */
export function markGochiEggSeen(eggId: string): Promise<ExploreStateRecord> {
  return enqueue(async () => {
    const current = await readUnlocked();
    if (!current.newEggIds.includes(eggId)) {
      return current;
    }
    return writeUnlocked({
      ...current,
      newEggIds: current.newEggIds.filter((id) => id !== eggId),
    });
  });
}
