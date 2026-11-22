import AsyncStorage from '@react-native-async-storage/async-storage';

import { VISIBLE_ISLAND_LOOKS, type IslandLook } from '@/components/island/beach-home';

const ISLAND_LOOK_KEY = 'island/look';
const DEFAULT_LOOK: IslandLook = 1;

/** 홈·웰컴이 같이 쓰는 섬 모양. 홈에서 바꾸면 웰컴도 같은 look 을 본다. */
export function normalizeIslandLook(value: unknown): IslandLook {
  const n = Number(value);
  if ((n === 1 || n === 2 || n === 3) && VISIBLE_ISLAND_LOOKS.includes(n)) {
    return n;
  }
  return VISIBLE_ISLAND_LOOKS[0] ?? DEFAULT_LOOK;
}

export async function readIslandLook(): Promise<IslandLook> {
  const raw = await AsyncStorage.getItem(ISLAND_LOOK_KEY);
  if (!raw) {
    return DEFAULT_LOOK;
  }
  try {
    return normalizeIslandLook(JSON.parse(raw));
  } catch {
    return normalizeIslandLook(raw);
  }
}

export async function writeIslandLook(look: IslandLook): Promise<void> {
  await AsyncStorage.setItem(ISLAND_LOOK_KEY, JSON.stringify(normalizeIslandLook(look)));
}

export { ISLAND_LOOK_KEY };
