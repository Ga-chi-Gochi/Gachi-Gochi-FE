import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'onboarding/seen';
const NAME_KEY = 'onboarding/name';

export function hasSeenOnboarding(): Promise<boolean> {
  return AsyncStorage.getItem(SEEN_KEY).then((value) => value === 'true');
}

export function markOnboardingSeen(): Promise<void> {
  return AsyncStorage.setItem(SEEN_KEY, 'true');
}

export function readCreatureName(): Promise<string | null> {
  return AsyncStorage.getItem(NAME_KEY);
}

export function saveCreatureName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    return AsyncStorage.removeItem(NAME_KEY);
  }
  return AsyncStorage.setItem(NAME_KEY, trimmed);
}
