import { Pressable, ScrollView, View } from 'react-native';

import { PixelText } from '@/components/pixel/pixel-ui';
import { StorePriceTag, StoreProductImage } from '@/components/store-product-image';
import { pixel } from '@/constants/pixel-theme';
import type { StoreProduct } from '@/constants/store-items';
import { useResponsive } from '@/hooks/use-responsive';

const COLUMNS = 3;
const DIM_OPACITY = 0.45;
const DIM_COVER = 'rgba(120,116,124,0.28)';

export function StoreGrid({
  products,
  selectedId,
  ownedIds,
  equippedIds = [],
  dimmedIds = [],
  dimmedLabel,
  onSelect,
}: {
  products: StoreProduct[];
  selectedId: string | null;
  ownedIds: string[];
  equippedIds?: string[];
  dimmedIds?: string[];
  dimmedLabel?: string;
  onSelect: (product: StoreProduct) => void;
}) {
  const { scale, width } = useResponsive();
  const gap = scale(10);
  const cellWidth = Math.floor((width - scale(32) - gap * (COLUMNS - 1)) / COLUMNS);
  const imageSize = cellWidth - scale(16);

  if (products.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24) }}>
        <PixelText size={13} color={pixel.muted} center>
          아직 준비된 상품이 없어요.
        </PixelText>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
        paddingHorizontal: scale(16),
        paddingTop: scale(4),
        paddingBottom: scale(24),
      }}>
      {products.map((product) => {
        const selected = product.id === selectedId;
        const has = product.kind === 'item' && ownedIds.includes(product.id);
        const worn = has && equippedIds.includes(product.id);
        const dimmed = dimmedIds.includes(product.id);
        return (
          <Pressable
            key={product.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${product.name}, ${product.priceLabel}${worn ? ', 착용 중' : has ? ', 보유 중' : ''}`}
            onPress={() => onSelect(product)}
            style={{
              width: cellWidth,
              alignItems: 'center',
              gap: scale(6),
              paddingVertical: scale(8),
              borderWidth: scale(pixel.border),
              borderColor: selected ? pixel.tangerine : pixel.ink,
              backgroundColor: selected ? '#FFE2C7' : pixel.white,
            }}>
            <View style={{ opacity: dimmed ? DIM_OPACITY : 1 }}>
              <StoreProductImage product={product} size={imageSize} />
            </View>
            <PixelText size={12} center color={dimmed ? pixel.muted : pixel.ink}>
              {product.name}
            </PixelText>
            {dimmed && !worn ? (
              <PixelText size={10} color={pixel.muted} center>
                {dimmedLabel}
              </PixelText>
            ) : has ? (
              <PixelText size={11} color={worn ? pixel.tangerine : pixel.muted} center>
                {worn ? '착용 중' : '보유 중'}
              </PixelText>
            ) : (
              <StorePriceTag product={product} size={11} />
            )}
            {dimmed ? (
              <View
                pointerEvents="none"
                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: DIM_COVER }}
              />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
