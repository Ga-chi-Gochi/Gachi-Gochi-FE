import {
  isHealthDataAvailableAsync,
  queryStatisticsForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';

export type HealthStepsPermission = 'granted' | 'denied' | 'unavailable';

export type HealthStepsSource = 'healthkit' | 'healthconnect';

export type TodayHealthSteps = {
  steps: number;
  distanceMeters: number | null;
  source: HealthStepsSource | null;
};

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
] as const;

/** 읽기 권한은 허용/거부를 앱에 안 알려 주므로, 요청 성공 여부만 세션에 기억한다. */
let healthReady = false;

function startOfToday(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getHealthStepsSource(): HealthStepsSource | null {
  return 'healthkit';
}

export async function isHealthStepsAvailable(): Promise<boolean> {
  try {
    return await isHealthDataAvailableAsync();
  } catch {
    return false;
  }
}

export async function getHealthStepsPermission(): Promise<HealthStepsPermission> {
  if (!(await isHealthStepsAvailable())) {
    return 'unavailable';
  }
  return healthReady ? 'granted' : 'denied';
}

export async function requestHealthStepsPermission(): Promise<HealthStepsPermission> {
  if (!(await isHealthStepsAvailable())) {
    return 'unavailable';
  }
  try {
    // 시스템 건강 권한 시트가 여기서 뜬다.
    await requestAuthorization({ toRead: [...READ_TYPES] });
    healthReady = true;
    return 'granted';
  } catch {
    healthReady = false;
    return 'denied';
  }
}

export async function readTodayHealthSteps(): Promise<TodayHealthSteps> {
  if (!healthReady) {
    const permission = await requestHealthStepsPermission();
    if (permission !== 'granted') {
      return { steps: 0, distanceMeters: null, source: 'healthkit' };
    }
  }

  const end = new Date();
  const start = startOfToday(end);
  const filter = { date: { startDate: start, endDate: end } };

  try {
    const [stepsStats, distanceStats] = await Promise.all([
      queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
        filter,
        unit: 'count',
      }),
      queryStatisticsForQuantity('HKQuantityTypeIdentifierDistanceWalkingRunning', ['cumulativeSum'], {
        filter,
        unit: 'm',
      }).catch(() => null),
    ]);

    return {
      steps: Math.max(0, Math.round(stepsStats.sumQuantity?.quantity ?? 0)),
      distanceMeters:
        distanceStats?.sumQuantity?.quantity == null
          ? null
          : Math.max(0, Math.round(distanceStats.sumQuantity.quantity)),
      source: 'healthkit',
    };
  } catch {
    return { steps: 0, distanceMeters: null, source: 'healthkit' };
  }
}

export function openHealthStepsSettings(): void {
  void Linking.openSettings();
}
