import AsyncStorage from '@react-native-async-storage/async-storage';

/** 디자인 카피(하루 3번)와 동일 */
export const BONGGING_DAILY_LIMIT = 3;

const KEY = 'bongging/daily';

type DailyRecord = {
  date: string;
  count: number;
};

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function read(): Promise<DailyRecord> {
  const raw = await AsyncStorage.getItem(KEY);
  const today = todayKey();
  if (!raw) {
    return { date: today, count: 0 };
  }
  try {
    const saved = JSON.parse(raw) as Partial<DailyRecord>;
    if (saved.date !== today) {
      return { date: today, count: 0 };
    }
    return { date: today, count: Math.max(0, Number(saved.count) || 0) };
  } catch {
    return { date: today, count: 0 };
  }
}

export async function readBonggingDailyCount(): Promise<number> {
  return (await read()).count;
}

export async function isBonggingDailyLimitReached(): Promise<boolean> {
  return (await read()).count >= BONGGING_DAILY_LIMIT;
}

export async function markBonggingCertified(): Promise<number> {
  const current = await read();
  const next = { date: todayKey(), count: Math.min(BONGGING_DAILY_LIMIT, current.count + 1) };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next.count;
}
