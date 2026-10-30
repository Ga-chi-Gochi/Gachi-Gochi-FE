import AsyncStorage from '@react-native-async-storage/async-storage';

/** 앱이 쓰는 로컬 저장 키 — 초기화 시 전부 삭제 */
const LOCAL_STORAGE_KEYS = [
  'creature/state',
  'island/state',
  'walking/reward',
  'walking/intro-seen',
  'walking/privacy-consent',
] as const;

export async function clearLocalGameData(): Promise<void> {
  await AsyncStorage.multiRemove([...LOCAL_STORAGE_KEYS]);
}
