import AsyncStorage from '@react-native-async-storage/async-storage';

const CREATURE_STATE_KEY = 'creature/state';

export type CreatureStateRecord = {
  xp: number;
  /** 성장 연출을 이미 보여 준 최고 레벨 */
  lastSeenGrowthLevel: number;
};

const DEFAULT_RECORD: CreatureStateRecord = {
  xp: 0,
  lastSeenGrowthLevel: 1,
};

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

function normalize(saved: Partial<CreatureStateRecord> | null | undefined): CreatureStateRecord {
  return {
    xp: Math.max(0, Number(saved?.xp) || 0),
    lastSeenGrowthLevel: Math.max(1, Number(saved?.lastSeenGrowthLevel) || 1),
  };
}

async function readUnlocked(): Promise<CreatureStateRecord> {
  const raw = await AsyncStorage.getItem(CREATURE_STATE_KEY);
  if (!raw) {
    return { ...DEFAULT_RECORD };
  }
  try {
    return normalize(JSON.parse(raw) as Partial<CreatureStateRecord>);
  } catch {
    return { ...DEFAULT_RECORD };
  }
}

async function writeUnlocked(next: CreatureStateRecord): Promise<CreatureStateRecord> {
  const record = normalize(next);
  await AsyncStorage.setItem(CREATURE_STATE_KEY, JSON.stringify(record));
  return record;
}

export function readCreatureState(): Promise<CreatureStateRecord> {
  return enqueue(readUnlocked);
}

export function writeCreatureState(next: CreatureStateRecord): Promise<CreatureStateRecord> {
  return enqueue(() => writeUnlocked(next));
}

export function addCreatureXp(amount: number): Promise<CreatureStateRecord> {
  return enqueue(async () => {
    const current = await readUnlocked();
    return writeUnlocked({ ...current, xp: current.xp + Math.max(0, amount) });
  });
}

export function markGrowthLevelSeen(level: number): Promise<CreatureStateRecord> {
  return enqueue(async () => {
    const current = await readUnlocked();
    return writeUnlocked({
      ...current,
      lastSeenGrowthLevel: Math.max(current.lastSeenGrowthLevel, level),
    });
  });
}
