/** 웹·타입체크용 기본 구현. 실제 iOS/Android 는 `health-steps.native.ts` 가 쓴다. */

export type HealthStepsPermission = 'granted' | 'denied' | 'unavailable';

export type HealthStepsSource = 'healthkit' | 'healthconnect';

export type TodayHealthSteps = {
  steps: number;
  /** 건강 앱에서 거리를 못 읽으면 null */
  distanceMeters: number | null;
  source: HealthStepsSource | null;
};

export function getHealthStepsSource(): HealthStepsSource | null {
  return null;
}

export async function isHealthStepsAvailable(): Promise<boolean> {
  return false;
}

export async function getHealthStepsPermission(): Promise<HealthStepsPermission> {
  return 'unavailable';
}

export async function requestHealthStepsPermission(): Promise<HealthStepsPermission> {
  return 'unavailable';
}

export async function readTodayHealthSteps(): Promise<TodayHealthSteps> {
  return { steps: 0, distanceMeters: null, source: null };
}

/** 권한 설정 화면으로 보낸다. 웹에서는 아무 동작도 하지 않는다. */
export function openHealthStepsSettings(): void {}
