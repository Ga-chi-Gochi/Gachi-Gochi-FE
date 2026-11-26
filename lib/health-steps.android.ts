import { Linking } from 'react-native';

import { canUseHealthConnectNative } from '@/lib/health-native-gate';

export type HealthStepsPermission = 'granted' | 'denied' | 'unavailable';

export type HealthStepsSource = 'healthkit' | 'healthconnect';

export type TodayHealthSteps = {
  steps: number;
  distanceMeters: number | null;
  source: HealthStepsSource | null;
};

type HealthConnectModule = typeof import('react-native-health-connect');

const ANDROID_PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'Steps' as const },
  { accessType: 'read' as const, recordType: 'Distance' as const },
];

/** 네이티브가 없으면 Health Connect 패키지를 아예 열지 않는다. */
let healthConnect: HealthConnectModule | null | undefined;

function loadHealthConnect(): HealthConnectModule | null {
  if (healthConnect !== undefined) {
    return healthConnect;
  }
  if (!canUseHealthConnectNative()) {
    healthConnect = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    healthConnect = require('react-native-health-connect') as HealthConnectModule;
  } catch {
    healthConnect = null;
  }
  return healthConnect;
}

function startOfToday(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getHealthStepsSource(): HealthStepsSource | null {
  return canUseHealthConnectNative() ? 'healthconnect' : null;
}

export async function isHealthStepsAvailable(): Promise<boolean> {
  const hc = loadHealthConnect();
  if (!hc) {
    return false;
  }
  try {
    const status = await hc.getSdkStatus();
    return status === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

async function ensureReady(): Promise<boolean> {
  const hc = loadHealthConnect();
  if (!hc || !(await isHealthStepsAvailable())) {
    return false;
  }
  try {
    return await hc.initialize();
  } catch {
    return false;
  }
}

export async function getHealthStepsPermission(): Promise<HealthStepsPermission> {
  const hc = loadHealthConnect();
  if (!hc || !(await ensureReady())) {
    return 'unavailable';
  }
  try {
    const granted = await hc.getGrantedPermissions();
    const hasSteps = granted.some(
      (item) => 'recordType' in item && item.recordType === 'Steps' && item.accessType === 'read',
    );
    return hasSteps ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function requestHealthStepsPermission(): Promise<HealthStepsPermission> {
  const hc = loadHealthConnect();
  if (!hc || !(await ensureReady())) {
    return 'unavailable';
  }
  try {
    const granted = await hc.requestPermission(ANDROID_PERMISSIONS);
    const hasSteps = granted.some(
      (item) => 'recordType' in item && item.recordType === 'Steps' && item.accessType === 'read',
    );
    return hasSteps ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function readTodayHealthSteps(): Promise<TodayHealthSteps> {
  const hc = loadHealthConnect();
  if (!hc) {
    return { steps: 0, distanceMeters: null, source: null };
  }
  const permission = await getHealthStepsPermission();
  if (permission !== 'granted') {
    return { steps: 0, distanceMeters: null, source: 'healthconnect' };
  }
  if (!(await ensureReady())) {
    return { steps: 0, distanceMeters: null, source: 'healthconnect' };
  }

  const end = new Date();
  const start = startOfToday(end);
  const timeRangeFilter = {
    operator: 'between' as const,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };

  try {
    const steps = await hc.aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter,
    });
    const distance = await hc
      .aggregateRecord({
        recordType: 'Distance',
        timeRangeFilter,
      })
      .catch(() => null);

    return {
      steps: Math.max(0, Math.round(steps.COUNT_TOTAL ?? 0)),
      distanceMeters:
        distance?.DISTANCE?.inMeters == null ? null : Math.max(0, Math.round(distance.DISTANCE.inMeters)),
      source: 'healthconnect',
    };
  } catch {
    return { steps: 0, distanceMeters: null, source: 'healthconnect' };
  }
}

export function openHealthStepsSettings(): void {
  const hc = loadHealthConnect();
  try {
    hc?.openHealthConnectSettings();
  } catch {
    void Linking.openSettings();
  }
}
