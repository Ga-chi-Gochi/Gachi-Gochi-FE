import { View } from 'react-native';

import { HomeTopBar, HomeTopIcons, useHomeTopLayout } from '@/components/home-top-bar';
import { PixelText } from '@/components/pixel/pixel-ui';
import { useResponsive } from '@/hooks/use-responsive';

export function StoreHeader() {
  const { scale } = useResponsive();
  const { iconsInset, iconsHeight } = useHomeTopLayout();

  return (
    <View
      style={{
        paddingLeft: scale(16),
        paddingRight: scale(16) + iconsInset,
        paddingTop: scale(8),
        paddingBottom: scale(10),
        gap: scale(8),
        minHeight: scale(18) + iconsHeight,
        zIndex: 10,
      }}>
      <HomeTopBar />
      <PixelText size={22}>상점</PixelText>
      <HomeTopIcons top={scale(8)} side={scale(16)} />
    </View>
  );
}
