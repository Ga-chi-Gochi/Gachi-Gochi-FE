import { View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { pixel } from '@/constants/pixel-theme';
import type { StoreProduct } from '@/constants/store-items';
import { useResponsive } from '@/hooks/use-responsive';

export function StoreProductImage({ product, size }: { product: StoreProduct; size: number }) {
  const { scale } = useResponsive();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: scale(2),
        borderColor: pixel.ink,
        backgroundColor: product.sprite ? pixel.sky : '#C9C5CC',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {product.sprite ? <PixelSprite id={product.sprite} size={Math.round(size * 0.62)} /> : null}
    </View>
  );
}
