import { Linking } from 'react-native';

import { canUseHealthKitNative } from '@/lib/health-native-gate';

export type HealthStepsPermission = 'granted' | 'denied' | 'unavailable';

export type HealthStepsSource = 'healthkit' | 'healthconnect';

export type TodayHealthSteps = {
  steps: number;
  distanceMeters: number | null;
  source: HealthStepsSource | null;
};

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
] as const;

/** 읽기 권한은 허용/거부를 앱에 안 알려 주므로, 요청 성공 여부만 세션에 기억한다. */
let healthReady = false;

/** NitroModules 가 없는 바이너리에서는 HealthKit 패키지를 아예 열지 않는다. */
let healthKit: HealthKitModule | null | undefined;

function loadHealthKit(): HealthKitModule | null {
  if (healthKit !== undefined) {
    return healthKit;
  }
  if (!canUseHealthKitNative()) {
    healthKit = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    healthKit = require('@kingstinct/react-native-healthkit') as HealthKitModule;
  } catch {
    healthKit = null;
  }
  return healthKit;
}

function startOfToday(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getHealthStepsSource(): HealthStepsSource | null {
  return canUseHealthKitNative() ? 'healthkit' : null;
}

export async function isHealthStepsAvailable(): Promise<boolean> {
  const kit = loadHealthKit();
  if (!kit) {
    return false;
  }
  try {
    return await kit.isHealthDataAvailableAsync();
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
  const kit = loadHealthKit();
  if (!kit || !(await isHealthStepsAvailable())) {
    return 'unavailable';
  }
  try {
    await kit.requestAuthorization({ toRead: [...READ_TYPES] });
    healthReady = true;
    return 'granted';
  } catch {
    healthReady = false;
    return 'denied';
  }
}

export async function readTodayHealthSteps(): Promise<TodayHealthSteps> {
  const kit = loadHealthKit();
  if (!kit) {
    return { steps: 0, distanceMeters: null, source: null };
  }
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
      kit.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
        filter,
        unit: 'count',
      }),
      kit
        .queryStatisticsForQuantity('HKQuantityTypeIdentifierDistanceWalkingRunning', ['cumulativeSum'], {
          filter,
          unit: 'm',
        })
        .catch(() => null),
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
