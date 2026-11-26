import AsyncStorage from '@react-native-async-storage/async-storage';

const CREATURE_STATE_KEY = 'creature/state';

export type CreatureStateRecord = {
  xp: number;
  /** 성장 연출을 이미 보여 준 최고 레벨 */
  lastSeenGrowthLevel: number;
  /**
   * 홈에서 아직 안 본 성장 연출 목표 레벨.
   * 다른 화면에서 레벨업하면 여기에 남겨 두고, 홈 도착 때 재생한다.
   */
  pendingGrowthLevel: number | null;
};

const DEFAULT_RECORD: CreatureStateRecord = {
  xp: 0,
  lastSeenGrowthLevel: 1,
  pendingGrowthLevel: null,
};

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

function normalize(saved: Partial<CreatureStateRecord> | null | undefined): CreatureStateRecord {
  const pendingRaw = Number(saved?.pendingGrowthLevel);
  return {
    xp: Math.max(0, Number(saved?.xp) || 0),
    lastSeenGrowthLevel: Math.max(1, Number(saved?.lastSeenGrowthLevel) || 1),
    pendingGrowthLevel: Number.isFinite(pendingRaw) && pendingRaw > 1 ? pendingRaw : null,
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
    const pending =
      current.pendingGrowthLevel != null && current.pendingGrowthLevel <= level
        ? null
        : current.pendingGrowthLevel;
    return writeUnlocked({
      ...current,
      lastSeenGrowthLevel: Math.max(current.lastSeenGrowthLevel, level),
      pendingGrowthLevel: pending,
    });
  });
}

/** 홈이 아닌 곳에서 레벨업했을 때, 나중에 홈에서 보여줄 성장 연출을 남긴다 */
export function setPendingGrowthLevel(level: number | null): Promise<CreatureStateRecord> {
  return enqueue(async () => {
    const current = await readUnlocked();
    return writeUnlocked({
      ...current,
      pendingGrowthLevel: level != null && level > 1 ? level : null,
    });
  });
}
