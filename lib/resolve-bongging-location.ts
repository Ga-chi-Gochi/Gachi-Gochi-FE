import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

import { readGpsFromExif } from '@/lib/bongging-certification';

const PHOTO_ONLY_WARNING = '위치 없이 인증하면 장소 확인이 빠지고, 나중에 위치 기반 보너스를 받지 못할 수 있어요.';

export type ResolvedBonggingLocation =
  | { status: 'coordinates'; latitude: number; longitude: number; source: 'exif' | 'device' }
  | { status: 'photo-only' }
  | { status: 'cancelled' };

export async function requestLocationPermissionIfNeeded(): Promise<void> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted || !current.canAskAgain) {
    return;
  }
  await Location.requestForegroundPermissionsAsync();
}

export async function resolveBonggingLocation(exif: unknown): Promise<ResolvedBonggingLocation> {
  const embedded = readGpsFromExif(exif);
  if (embedded) {
    return { status: 'coordinates', ...embedded, source: 'exif' };
  }

  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) {
    if (!(await locationServicesEnabled())) {
      return resolveWithServicesOff();
    }
    return readDeviceLocation();
  }

  if (!current.canAskAgain) {
    const choice = await ask('위치 권한이 필요해요', PHOTO_ONLY_WARNING, [
      { id: 'photo', text: '사진만 인증' },
      { id: 'settings', text: '설정에서 허용' },
    ]);
    if (choice === 'settings') {
      await Linking.openSettings();
      return { status: 'cancelled' };
    }
    return choice === 'photo' ? { status: 'photo-only' } : { status: 'cancelled' };
  }

  const choice = await ask('위치 정보를 허용하시겠어요?', '이 사진에는 위치 정보가 없어요. 허용하면 지금 있는 곳의 위도와 경도를 인증에 함께 담아요.', [
    { id: 'photo', text: '사진만 진행' },
    { id: 'allow', text: '허용' },
  ]);
  if (choice === 'photo') {
    return confirmPhotoOnly();
  }
  if (choice !== 'allow') {
    return { status: 'cancelled' };
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  if (!requested.granted) {
    const next = await ask('위치 권한이 필요해요', PHOTO_ONLY_WARNING, [
      { id: 'photo', text: '사진만 인증' },
      { id: 'settings', text: '설정에서 허용' },
    ]);
    if (next === 'settings') {
      await Linking.openSettings();
      return { status: 'cancelled' };
    }
    return next === 'photo' ? { status: 'photo-only' } : { status: 'cancelled' };
  }

  if (!(await locationServicesEnabled())) {
    return resolveWithServicesOff();
  }
  return readDeviceLocation();
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
    if (!(await locationServicesEnabled())) {
      return resolveWithServicesOff();
    }
    return confirmPhotoOnly('현재 위치를 가져오지 못했어요. 위치 없이 인증하면 장소 확인이 빠지고, 나중에 위치 기반 보너스를 받지 못할 수 있어요.');
  }
}

async function locationServicesEnabled() {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return true;
  }
}

function resolveWithServicesOff(): Promise<ResolvedBonggingLocation> {
  return ask('위치 서비스가 꺼져 있어요', '기기의 위치 서비스가 꺼져 있어 지금 위치를 확인할 수 없어요. 사진만 인증하면 장소 확인이 빠지고, 나중에 위치 기반 보너스를 받지 못할 수 있어요.', [
    { id: 'cancel', text: '취소', style: 'cancel' },
    { id: 'settings', text: '설정 열기' },
    { id: 'photo', text: '사진만 인증' },
  ]).then(async (choice) => {
    if (choice === 'settings') {
      await Linking.openSettings();
      return { status: 'cancelled' };
    }
    return choice === 'photo' ? { status: 'photo-only' } : { status: 'cancelled' };
  });
}

function confirmPhotoOnly(message = PHOTO_ONLY_WARNING): Promise<ResolvedBonggingLocation> {
  return ask('사진만으로 인증할까요?', message, [
    { id: 'cancel', text: '취소', style: 'cancel' },
    { id: 'photo', text: '사진만 인증' },
  ]).then((choice) => (choice === 'photo' ? { status: 'photo-only' } : { status: 'cancelled' }));
}

function ask(title: string, message: string, buttons: { id: string; text: string; style?: 'cancel' | 'default' }[]): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      buttons.map((button) => ({
        text: button.text,
        style: button.style,
        onPress: () => resolve(button.id),
      })),
      { cancelable: false },
    );
  });
}
