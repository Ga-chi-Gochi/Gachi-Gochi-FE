import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 온보딩 직후 튜토리얼의 저장 상태를 한 곳에서 읽고 쓴다.
 * - 완료 여부(completed / skipped)와 그때의 튜토리얼 버전
 * - 앱을 껐다 켜도 이어 갈 진행 단계
 * - 완료 보상(귤코인)을 이미 받았는지
 */

/** 튜토리얼 내용을 크게 바꿀 때 올린다. 지금은 값만 기록하고 다른 동작에는 쓰지 않는다 */
export const TUTORIAL_VERSION = 1;

/** 'onboarding/tour-seen' 은 예전 안내 때부터 쓰던 키다. 예전 값 'true' 는 completed 로 읽는다 */
const STATUS_KEY = 'onboarding/tour-seen';
const VERSION_KEY = 'onboarding/tour-version';
const STEP_KEY = 'onboarding/tour-step';
const REWARD_KEY = 'onboarding/tour-reward';

export type TutorialStatus = 'completed' | 'skipped';

export type TutorialRecord = {
  /** null 이면 아직 끝내지도 건너뛰지도 않았다 */
  status: TutorialStatus | null;
  /** 상태를 저장할 때의 튜토리얼 버전. 버전 기록 이전에 저장된 값이면 null */
  version: number | null;
};

/** 앱을 껐다 켜도 이어 갈 수 있는 튜토리얼 단계. 화면 안(카메라·걷기)에 있는 단계는 저장하지 않는다 */
export type TutorialRestStep = 'compass' | 'bongging' | 'walking' | 'gift' | 'finish';

const REST_STEPS: readonly string[] = ['compass', 'bongging', 'walking', 'gift', 'finish'];

const WRITE_ATTEMPTS = 3;
const WRITE_RETRY_MS = 300;

// 저장이 끝내 실패해도 이번 실행 동안은 방금 정한 상태를 기억해, 같은 실행에서 튜토리얼이 다시 뜨지 않게 한다.
// undefined 는 아직 읽지 않았다는 뜻이다.
let sessionStatus: TutorialStatus | null | undefined;
let sessionRewardClaimed: boolean | undefined;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 알림 없이 몇 번 더 시도한다. 끝내 실패하면 false */
async function writeWithRetry(task: () => Promise<void>): Promise<boolean> {
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt += 1) {
    try {
      await task();
      return true;
    } catch {
      if (attempt < WRITE_ATTEMPTS - 1) {
        await delay(WRITE_RETRY_MS);
      }
    }
  }
  return false;
}

function parseStatus(value: string | null): TutorialStatus | null {
  if (value === 'completed' || value === 'true') return 'completed';
  if (value === 'skipped') return 'skipped';
  return null;
}

async function readStoredStatus(): Promise<TutorialStatus | null> {
  return parseStatus(await AsyncStorage.getItem(STATUS_KEY));
}

/** 완료 여부와 버전을 읽는다. 이번 실행에서 정한 값이 있으면 저장소보다 그것을 따른다 */
export async function readTutorialRecord(): Promise<TutorialRecord> {
  const [storedStatus, storedVersion] = await Promise.all([readStoredStatus(), AsyncStorage.getItem(VERSION_KEY)]);
  const status = sessionStatus === undefined ? storedStatus : sessionStatus;
  const parsed = Number(storedVersion);
  return { status, version: storedVersion !== null && Number.isFinite(parsed) ? parsed : null };
}

/**
 * 튜토리얼을 끝냈거나 건너뛴 것을 저장한다. 실패해도 오류를 던지지 않는다.
 * 이미 완료한 사람이 다시 보기에서 건너뛰어도 completed 는 skipped 로 바뀌지 않는다.
 */
export async function saveTutorialStatus(status: TutorialStatus): Promise<void> {
  const current = sessionStatus === undefined ? await readStoredStatus().catch(() => null) : sessionStatus;
  const next: TutorialStatus = current === 'completed' ? 'completed' : status;
  sessionStatus = next;
  if (current === next && status === 'skipped') {
    return;
  }
  await writeWithRetry(() =>
    AsyncStorage.multiSet([
      [STATUS_KEY, next],
      [VERSION_KEY, String(TUTORIAL_VERSION)],
    ]),
  );
}

export async function readTutorialStep(): Promise<TutorialRestStep | null> {
  const value = await AsyncStorage.getItem(STEP_KEY);
  return value && REST_STEPS.includes(value) ? (value as TutorialRestStep) : null;
}

/** 진행 단계는 자주 바뀌고 잃어도 큰 문제가 없어서 실패하면 그냥 넘어간다 */
export function saveTutorialStep(step: TutorialRestStep | null): Promise<void> {
  const write = step ? AsyncStorage.setItem(STEP_KEY, step) : AsyncStorage.removeItem(STEP_KEY);
  return write.catch(() => undefined);
}

/** 튜토리얼 완료 보상(귤코인)을 이미 받았는지 */
export async function hasClaimedTutorialReward(): Promise<boolean> {
  if (sessionRewardClaimed !== undefined) {
    return sessionRewardClaimed;
  }
  return (await AsyncStorage.getItem(REWARD_KEY)) === 'true';
}

/** 보상을 받은 것을 저장한다. 저장이 실패해도 이번 실행에서는 다시 주지 않는다 */
export async function markTutorialRewardClaimed(): Promise<void> {
  sessionRewardClaimed = true;
  await writeWithRetry(() => AsyncStorage.setItem(REWARD_KEY, 'true'));
}

/** 로컬 데이터를 지울 때 이번 실행에서 기억하던 값도 같이 잊는다 */
export function resetTutorialSession(): void {
  sessionStatus = undefined;
  sessionRewardClaimed = undefined;
}
