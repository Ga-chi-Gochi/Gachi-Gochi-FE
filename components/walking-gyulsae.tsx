import { Image } from 'expo-image';
import { PixelRatio, View } from 'react-native';

const GYULSAE_ART_PIXELS = 32;
const GYULSAE_EMPTY_TOP_PIXELS = 9;

function getCrispSize(target: number) {
  const ratio = PixelRatio.get();
  const multiple = Math.max(1, Math.round((target * ratio) / GYULSAE_ART_PIXELS));
  return (multiple * GYULSAE_ART_PIXELS) / ratio;
}

export function WalkingGyulsae({ size }: { size: number }) {
  const crispSize = getCrispSize(size);
  const emptyTop = (crispSize / GYULSAE_ART_PIXELS) * GYULSAE_EMPTY_TOP_PIXELS;

  return (
    <View accessibilityLabel="귤새" style={{ alignItems: 'center', height: crispSize - emptyTop, overflow: 'hidden' }}>
      <Image
        source={require('@/assets/pixel/gyulsae-juvenile.png')}
        style={{ width: crispSize, height: crispSize, marginTop: -emptyTop }}
        contentFit="fill"
      />
    </View>
  );
}
