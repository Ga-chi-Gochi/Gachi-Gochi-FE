import { Linking } from 'react-native';
import {
  SdkAvailabilityStatus,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
} from 'react-native-health-connect';

export type HealthStepsPermission = 'granted' | 'denied' | 'unavailable';

export type HealthStepsSource = 'healthkit' | 'healthconnect';

export type TodayHealthSteps = {
  steps: number;
  distanceMeters: number | null;
  source: HealthStepsSource | null;
};

const ANDROID_PERMISSIONS = [
  { accessType: 'read' as const, recordType: 'Steps' as const },
  { accessType: 'read' as const, recordType: 'Distance' as const },
];

function startOfToday(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getHealthStepsSource(): HealthStepsSource | null {
  return 'healthconnect';
}

export async function isHealthStepsAvailable(): Promise<boolean> {
  try {
    const status = await getSdkStatus();
    // 설치만 필요하면 설정/스토어로 보낼 수 있게 available 로 취급하지 않는다.
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

async function ensureReady(): Promise<boolean> {
  if (!(await isHealthStepsAvailable())) {
    return false;
  }
  try {
    return await initialize();
  } catch {
    return false;
  }
}

export async function getHealthStepsPermission(): Promise<HealthStepsPermission> {
  if (!(await ensureReady())) {
    return 'unavailable';
  }
  try {
    const granted = await getGrantedPermissions();
    const hasSteps = granted.some(
      (item) => 'recordType' in item && item.recordType === 'Steps' && item.accessType === 'read',
    );
    return hasSteps ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function requestHealthStepsPermission(): Promise<HealthStepsPermission> {
  if (!(await ensureReady())) {
    return 'unavailable';
  }
  try {
    const granted = await requestPermission(ANDROID_PERMISSIONS);
    const hasSteps = granted.some(
      (item) => 'recordType' in item && item.recordType === 'Steps' && item.accessType === 'read',
    );
    return hasSteps ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function readTodayHealthSteps(): Promise<TodayHealthSteps> {
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
    const steps = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter,
    });
    const distance = await aggregateRecord({
      recordType: 'Distance',
      timeRangeFilter,
    }).catch(() => null);

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
  try {
    openHealthConnectSettings();
  } catch {
    void Linking.openSettings();
  }
}
