import * as Location from 'expo-location';

import { readGpsFromExif } from '@/lib/bongging-certification';

export type ResolvedBonggingLocation =
  | { status: 'coordinates'; latitude: number; longitude: number; source: 'exif' | 'device' }
  | { status: 'photo-only' }
  | { status: 'cancelled' };

/** 위치 문구/알림은 당분간 숨김. 권한 요청도 UI에서 하지 않는다. */
export async function requestLocationPermissionIfNeeded(): Promise<void> {
  // no-op — 봉그깅 위치 문구 비표시 동안 사전 권한 요청 안 함
}

/**
 * 위치 관련 알림 없이 좌표만 조용히 시도.
 * EXIF → (이미 허용된 경우) 기기 GPS → 없으면 photo-only.
 */
export async function resolveBonggingLocation(exif: unknown): Promise<ResolvedBonggingLocation> {
  const embedded = readGpsFromExif(exif);
  if (embedded) {
    return { status: 'coordinates', ...embedded, source: 'exif' };
  }

  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (!current.granted) {
      return { status: 'photo-only' };
    }
    if (!(await locationServicesEnabled())) {
      return { status: 'photo-only' };
    }
    return await readDeviceLocation();
  } catch {
    return { status: 'photo-only' };
  }
}

async function readDeviceLocation(): Promise<ResolvedBonggingLocation> {
  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      status: 'coordinates',
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      source: 'device',
    };
  } catch {
    return { status: 'photo-only' };
  }
}

async function locationServicesEnabled() {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}
