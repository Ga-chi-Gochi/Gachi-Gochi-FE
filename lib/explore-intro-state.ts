import AsyncStorage from '@react-native-async-storage/async-storage';

/** 탐험 해금~진행 중 안내를 이미 본 적 있는지 */
const SEEN_KEY = 'explore/intro-seen';
/** 탐험 보상 팝업·버튼 안내를 이미 본 적 있는지 */
const REWARD_SEEN_KEY = 'explore/reward-intro-seen';

let sessionSeen: boolean | undefined;
let sessionRewardSeen: boolean | undefined;

export async function readExploreIntroSeen(): Promise<boolean> {
  if (sessionSeen !== undefined) {
    return sessionSeen;
  }
  try {
    const value = await AsyncStorage.getItem(SEEN_KEY);
    sessionSeen = value === 'true';
    return sessionSeen;
  } catch {
    return false;
  }
}

/** 해금~진행 안내를 본 것으로 저장. 실패해도 이번 실행에서는 다시 안 띄운다 */
export async function saveExploreIntroSeen(): Promise<void> {
  sessionSeen = true;
  try {
    await AsyncStorage.setItem(SEEN_KEY, 'true');
  } catch {
    // ignore
  }
}

export async function readExploreRewardIntroSeen(): Promise<boolean> {
  if (sessionRewardSeen !== undefined) {
    return sessionRewardSeen;
  }
  try {
    const value = await AsyncStorage.getItem(REWARD_SEEN_KEY);
    sessionRewardSeen = value === 'true';
    return sessionRewardSeen;
  } catch {
    return false;
  }
}

/** 보상 안내를 본 것으로 저장 */
export async function saveExploreRewardIntroSeen(): Promise<void> {
  sessionRewardSeen = true;
  try {
    await AsyncStorage.setItem(REWARD_SEEN_KEY, 'true');
  } catch {
    // ignore
  }
}

/** 로컬 초기화 시 세션 캐시도 지운다 */
export function resetExploreIntroSession(): void {
  sessionSeen = undefined;
  sessionRewardSeen = undefined;
}
