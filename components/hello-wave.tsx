import Animated from 'react-native-reanimated';

import { useResponsive } from '@/hooks/use-responsive';

export function HelloWave() {
  const { scale } = useResponsive();

  return (
    <Animated.Text
      style={{
        fontSize: scale(28),
        lineHeight: scale(32),
        marginTop: scale(-6),
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
  );
}
