import { Image } from 'expo-image';
import { Platform, View } from 'react-native';

import { WalkText } from '@/components/walking/walk-text';
import { gachiUi } from '@/constants/gachi-ui';
import { useResponsive } from '@/hooks/use-responsive';
import { snapArt } from '@/lib/pixel-snap';

const TANGERINE_ART = 15;
const crispStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

export function StoreCoinBadge({ value, height }: { value: number; height: number }) {
  const { scale } = useResponsive();
  const icon = snapArt(scale(24), TANGERINE_ART);

  return (
    <View
      accessible
      accessibilityLabel={`귤 ${value}개`}
      style={{
        height,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        paddingLeft: scale(6),
        paddingRight: scale(12),
        backgroundColor: gachiUi.beige,
        borderWidth: scale(gachiUi.border),
        borderColor: gachiUi.ink,
        borderRadius: height / 2,
      }}>
      <Image source={require('@/assets/ui/walking/walk-tangerine.png')} style={{ width: icon, height: icon, ...crispStyle }} contentFit="fill" />
      <WalkText size={16} color={gachiUi.ink}>
        {value}
      </WalkText>
    </View>
  );
}
