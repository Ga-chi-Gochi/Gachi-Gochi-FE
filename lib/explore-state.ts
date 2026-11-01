import AsyncStorage from '@react-native-async-storage/async-storage';

import { EXPLORE_DAILY_LIMIT, EXPLORE_DURATION_MS } from '@/constants/explore';

export const EXPLORE_STATE_KEY = 'explore/state';

export type ExploreStateRecord = {
  /** YYYY-MM-DD — 날짜가 바뀌면 remaining 리셋 */
  date: string;
  remaining: number;
  /** 탐험 종료 시각(epoch ms). 없으면 null */
  exploringUntil: number | null;
};

function todayKey(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function defaultRecord(now = new Date()): ExploreStateRecord {
  return {
    date: todayKey(now),
    remaining: EXPLORE_DAILY_LIMIT,
    exploringUntil: null,
  };
}

function normalize(saved: Partial<ExploreStateRecord> | null | undefined, now = new Date()): ExploreStateRecord {
  const today = todayKey(now);
  const date = typeof saved?.date === 'string' ? saved.date : today;
  const exploringUntil =
    typeof saved?.exploringUntil === 'number' && saved.exploringUntil > now.getTime()
      ? saved.exploringUntil
      : null;

  if (date !== today) {
    return {
      date: today,
      remaining: EXPLORE_DAILY_LIMIT,
      exploringUntil,
    };
  }

  return {
    date,
    remaining: Math.max(0, Math.min(EXPLORE_DAILY_LIMIT, Number(saved?.remaining) || 0)),
    exploringUntil,
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

/** 탐험 시작 — 횟수 1 차감, 타이머 시작. 불가하면 null */
export function startExploreTrip(): Promise<ExploreStateRecord | null> {
  return enqueue(async () => {
    const current = await readUnlocked();
    const now = Date.now();
    if (current.exploringUntil && current.exploringUntil > now) {
      return null;
    }
    if (current.remaining <= 0) {
      return null;
    }
    return writeUnlocked({
      ...current,
      remaining: current.remaining - 1,
      exploringUntil: now + EXPLORE_DURATION_MS,
    });
  });
}

/** 타이머 만료 시 탐험 종료 표시만 정리 (보상은 이후 단계에서) */
export function clearExploreTripIfDone(): Promise<ExploreStateRecord> {
  return enqueue(async () => {
    const current = await readUnlocked();
    if (!current.exploringUntil || current.exploringUntil > Date.now()) {
      return current;
    }
    return writeUnlocked({ ...current, exploringUntil: null });
  });
}
