import AsyncStorage from '@react-native-async-storage/async-storage';

import type { IslandZoneId } from '@/constants/island-zones';

const ISLAND_STATE_KEY = 'island/state';

export type PlacedDecor = {
  itemId: string;
  zoneId: IslandZoneId;
};

export type IslandStateRecord = {
  coins: number;
  owned: string[];
  placed: PlacedDecor[];
  unlockedZones: IslandZoneId[];
  /** 화산/확장 연출을 이미 본 구역 */
  seenZoneUnlocks: IslandZoneId[];
};

const DEFAULT_RECORD: IslandStateRecord = {
  coins: 120,
  owned: [],
  placed: [],
  unlockedZones: ['core'],
  seenZoneUnlocks: ['core'],
};

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

const ZONE_IDS: IslandZoneId[] = ['core', 'east', 'west', 'north', 'south'];

function asZoneId(value: unknown): IslandZoneId | null {
  return typeof value === 'string' && (ZONE_IDS as string[]).includes(value) ? (value as IslandZoneId) : null;
}

function normalize(saved: Partial<IslandStateRecord> | null | undefined): IslandStateRecord {
  const unlockedRaw = Array.isArray(saved?.unlockedZones) ? saved.unlockedZones : ['core'];
  const unlocked = unlockedRaw.map(asZoneId).filter((id): id is IslandZoneId => id != null);
  const seenRaw = Array.isArray(saved?.seenZoneUnlocks) ? saved.seenZoneUnlocks : ['core'];
  const seen = seenRaw.map(asZoneId).filter((id): id is IslandZoneId => id != null);
  return {
    coins: Math.max(0, Number(saved?.coins) || DEFAULT_RECORD.coins),
    owned: Array.isArray(saved?.owned) ? saved.owned.filter((id): id is string => typeof id === 'string') : [],
    placed: Array.isArray(saved?.placed)
      ? saved.placed
          .map((entry) => {
            if (!entry || typeof entry.itemId !== 'string') {
              return null;
            }
            const zoneId = asZoneId(entry.zoneId);
            return zoneId ? { itemId: entry.itemId, zoneId } : null;
          })
          .filter((entry): entry is PlacedDecor => entry != null)
      : [],
    unlockedZones: unlocked.includes('core') ? unlocked : (['core', ...unlocked] as IslandZoneId[]),
    seenZoneUnlocks: seen.includes('core') ? seen : (['core', ...seen] as IslandZoneId[]),
  };
}

async function readUnlocked(): Promise<IslandStateRecord> {
  const raw = await AsyncStorage.getItem(ISLAND_STATE_KEY);
  if (!raw) {
    return { ...DEFAULT_RECORD, owned: [], placed: [], unlockedZones: ['core'], seenZoneUnlocks: ['core'] };
  }
  try {
    return normalize(JSON.parse(raw) as Partial<IslandStateRecord>);
  } catch {
    return { ...DEFAULT_RECORD, owned: [], placed: [], unlockedZones: ['core'], seenZoneUnlocks: ['core'] };
  }
}

async function writeUnlocked(next: IslandStateRecord): Promise<IslandStateRecord> {
  const record = normalize(next);
  await AsyncStorage.setItem(ISLAND_STATE_KEY, JSON.stringify(record));
  return record;
}

export function readIslandState(): Promise<IslandStateRecord> {
  return enqueue(readUnlocked);
}

export function writeIslandState(next: IslandStateRecord): Promise<IslandStateRecord> {
  return enqueue(() => writeUnlocked(next));
}

export function updateIslandState(patch: (current: IslandStateRecord) => IslandStateRecord): Promise<IslandStateRecord> {
  return enqueue(async () => {
    const current = await readUnlocked();
    return writeUnlocked(patch(current));
  });
}
