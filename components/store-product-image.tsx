import { Image } from 'expo-image';
import { Platform, View } from 'react-native';

import { PixelAligned } from '@/components/pixel-aligned';
import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelText } from '@/components/pixel/pixel-ui';
import type { ShopItem } from '@/constants/content';
import { pixel } from '@/constants/pixel-theme';
import { isShopArtId } from '@/constants/shop-art';
import type { StoreProduct } from '@/constants/store-items';
import { SHOP_ART_HD } from '@/constants/wear-art';
import { useResponsive } from '@/hooks/use-responsive';
import { snapArt } from '@/lib/pixel-snap';

const crispStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;
const SHOP_ART_PIXELS = 32;
const CARD_SKY = '#D6EEF8';
const PRICE_ICON_SIZE = 14;

export function ShopItemSprite({ id, size }: { id: ShopItem['sprite']; size: number }) {
  if (isShopArtId(id)) {
    return (
      <PixelAligned>
        <Image source={SHOP_ART_HD[id]} style={{ width: size, height: size, ...crispStyle }} contentFit="contain" />
      </PixelAligned>
    );
  }
  return <PixelSprite id={id} size={size} />;
}

export function StoreProductImage({ product, size }: { product: StoreProduct; size: number }) {
  const { scale } = useResponsive();
  const art = product.sprite && isShopArtId(product.sprite);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: scale(2),
        borderColor: pixel.ink,
        backgroundColor: product.sprite ? CARD_SKY : '#C9C5CC',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {product.sprite ? (
        <ShopItemSprite id={product.sprite} size={art ? snapArt(size * 0.86, SHOP_ART_PIXELS) : Math.round(size * 0.62)} />
      ) : null}
    </View>
  );
}

export function StorePriceTag({ product, size = 12 }: { product: StoreProduct; size?: number }) {
  const { scale } = useResponsive();
  if (product.kind === 'coin') {
    return (
      <PixelText size={size} center>
        {product.priceLabel}
      </PixelText>
    );
  }
  const icon = scale(Math.round((PRICE_ICON_SIZE * size) / 12));
  return (
    <View
      accessible
      accessibilityLabel={product.priceLabel}
      style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
      <Image
        source={require('@/assets/pixel/icon-tangerine.png')}
        style={{ width: icon, height: icon }}
        contentFit="contain"
      />
      <PixelText size={size}>{`${product.price}개`}</PixelText>
    </View>
  );
}
