import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetTutorialSession } from '@/lib/tutorial-state';

/** 앱이 쓰는 로컬 저장 키 — 초기화 시 전부 삭제 */
const LOCAL_STORAGE_KEYS = [
  'creature/state',
  'island/state',
  'island/look',
  'explore/state',
  'walking/reward',
  'walking/intro-seen',
  'walking/privacy-consent',
  'onboarding/seen',
  'onboarding/name',
  'onboarding/tour-seen',
  'onboarding/tour-version',
  'onboarding/tour-step',
  'onboarding/tour-reward',
] as const;

export async function clearLocalGameData(): Promise<void> {
  await AsyncStorage.multiRemove([...LOCAL_STORAGE_KEYS]);
  resetTutorialSession();
}
