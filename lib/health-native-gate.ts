import Constants from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';

/**
 * Expo Go / Nitro 미포함 Dev Client 에서는 HealthKit 패키지를 require 하면
 * 모듈 초기화 예외가 try/catch 로도 LogBox 빨간 화면을 띄운다.
 * 네이티브 TurboModule 이 있을 때만 패키지를 연다.
 */
export function canUseHealthKitNative(): boolean {
  if (Constants.appOwnership === 'expo') {
    return false;
  }
  try {
    return TurboModuleRegistry.get('NitroModules') != null;
  } catch {
    return false;
  }
}

/** Health Connect 네이티브가 없으면 require 자체를 건너뛴다. */
export function canUseHealthConnectNative(): boolean {
  if (Constants.appOwnership === 'expo') {
    return false;
  }
  try {
    // react-native-health-connect 가 등록하는 모듈 이름
    return TurboModuleRegistry.get('HealthConnect') != null;
  } catch {
    return false;
  }
}
