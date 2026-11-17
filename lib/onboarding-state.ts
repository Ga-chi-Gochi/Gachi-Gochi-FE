import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'onboarding/seen';
const NAME_KEY = 'onboarding/name';
const TOUR_KEY = 'onboarding/tour-seen';

const TOUR_STEP_KEY = 'onboarding/tour-step';
const TOUR_REWARD_KEY = 'onboarding/tour-reward';

/** 앱을 껐다 켜도 이어 갈 수 있는 튜토리얼 단계. 화면 안(카메라·걷기)에 있는 단계는 저장하지 않는다 */
export type TutorialRestStep = 'compass' | 'bongging' | 'walking' | 'gift' | 'finish';

const REST_STEPS: readonly string[] = ['compass', 'bongging', 'walking', 'gift', 'finish'];

export async function readTutorialStep(): Promise<TutorialRestStep | null> {
  const value = await AsyncStorage.getItem(TOUR_STEP_KEY);
  return value && REST_STEPS.includes(value) ? (value as TutorialRestStep) : null;
}

export function saveTutorialStep(step: TutorialRestStep | null): Promise<void> {
  return step ? AsyncStorage.setItem(TOUR_STEP_KEY, step) : AsyncStorage.removeItem(TOUR_STEP_KEY);
}

/** 튜토리얼 완료 보상(귤코인)을 이미 받았는지 */
export function hasClaimedTutorialReward(): Promise<boolean> {
  return AsyncStorage.getItem(TOUR_REWARD_KEY).then((value) => value === 'true');
}

export function markTutorialRewardClaimed(): Promise<void> {
  return AsyncStorage.setItem(TOUR_REWARD_KEY, 'true');
}

/** 홈의 튜토리얼을 끝냈거나 건너뛰어서 더 이상 자동으로 띄우지 않아도 되는지 */
export function hasSeenActivityTour(): Promise<boolean> {
  return AsyncStorage.getItem(TOUR_KEY).then((value) => value === 'true');
}

export function markActivityTourSeen(): Promise<void> {
  return AsyncStorage.setItem(TOUR_KEY, 'true');
}

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
