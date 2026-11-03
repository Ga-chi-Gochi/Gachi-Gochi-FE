import { Pressable, ScrollView, View } from 'react-native';

import { PixelText } from '@/components/pixel/pixel-ui';
import { StoreProductImage } from '@/components/store-product-image';
import { pixel } from '@/constants/pixel-theme';
import type { StoreProduct } from '@/constants/store-items';
import { useResponsive } from '@/hooks/use-responsive';

const COLUMNS = 3;

export function StoreGrid({
  products,
  selectedId,
  ownedIds,
  onSelect,
}: {
  products: StoreProduct[];
  selectedId: string | null;
  ownedIds: string[];
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
        return (
          <Pressable
            key={product.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${product.name}, ${product.priceLabel}${has ? ', 보유 중' : ''}`}
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
            <StoreProductImage product={product} size={imageSize} />
            <PixelText size={12} color={has ? pixel.muted : pixel.ink} center>
              {has ? '보유 중' : product.priceLabel}
            </PixelText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
