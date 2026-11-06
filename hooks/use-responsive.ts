import { useWindowDimensions, PixelRatio } from 'react-native';

import { getScaleFactor } from '@/constants/layout';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const factor = getScaleFactor(width);

  const scale = (size: number) => PixelRatio.roundToNearestPixel(size * factor);

  return { width, height, factor, scale };
}
