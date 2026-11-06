import * as Network from 'expo-network';
import { Alert } from 'react-native';

export async function confirmOfflineCertification(): Promise<boolean> {
  const offline = await isOffline();
  if (!offline) {
    return true;
  }

  return new Promise((resolve) => {
    Alert.alert(
      '네트워크가 불안정해요',
      '지금은 서버에 보내지 못하고, 이 기기에서만 인증을 마칠게요.',
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        { text: '이어서 인증', onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });
}

async function isOffline() {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === false || state.isInternetReachable === false;
  } catch {
    return false;
  }
}
