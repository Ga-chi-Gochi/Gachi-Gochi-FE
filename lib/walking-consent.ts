import AsyncStorage from '@react-native-async-storage/async-storage';

const WALKING_CONSENT_KEY = 'walking/privacy-consent';

// '사용자 개인정보 수집 동의' 여부를 기기에 저장한다. 동의한 경우에만 저장하고, 거절은 저장하지 않아 다음에 다시 묻는다.
// [TODO: 실제 연동] 서버가 생기면 동의 일시·약관 버전과 함께 서버에도 남긴다.
export async function hasWalkingConsent(): Promise<boolean> {
  return (await AsyncStorage.getItem(WALKING_CONSENT_KEY)) === 'true';
}

export function saveWalkingConsent(): Promise<void> {
  return AsyncStorage.setItem(WALKING_CONSENT_KEY, 'true');
}

export function clearWalkingConsent(): Promise<void> {
  return AsyncStorage.removeItem(WALKING_CONSENT_KEY);
}
