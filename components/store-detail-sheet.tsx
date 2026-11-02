import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PixelButton, PixelText } from '@/components/pixel/pixel-ui';
import { StoreProductImage } from '@/components/store-product-image';
import { pixel } from '@/constants/pixel-theme';
import type { StoreProduct } from '@/constants/store-items';
import { useResponsive } from '@/hooks/use-responsive';

export function StoreDetailSheet({
  product,
  owned,
  onClose,
  onPurchase,
}: {
  product: StoreProduct | null;
  owned: boolean;
  onClose: () => void;
  onPurchase: (product: StoreProduct) => void;
}) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<StoreProduct | null>(product);

  if (product && product !== shown) {
    setShown(product);
  }

  return (
    <Modal visible={product !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="상세 창 닫기"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(26,21,32,0.35)' }}
        />
        {shown ? (
          <View
            style={{
              backgroundColor: pixel.panel,
              borderTopWidth: scale(pixel.border),
              borderColor: pixel.ink,
              paddingHorizontal: scale(20),
              paddingTop: scale(14),
              paddingBottom: insets.bottom + scale(16),
              gap: scale(10),
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                hitSlop={scale(10)}
                onPress={onClose}
                style={{ borderWidth: scale(2), borderColor: pixel.ink, backgroundColor: pixel.white, padding: scale(2) }}>
                <MaterialIcons name="close" size={scale(20)} color={pixel.ink} />
              </Pressable>
            </View>

            <View style={{ alignItems: 'center', gap: scale(8) }}>
              <StoreProductImage product={shown} size={scale(120)} />
              <PixelText size={14} color={pixel.tangerine}>
                {shown.priceLabel}
              </PixelText>
              <PixelText size={20}>{shown.name}</PixelText>
              <PixelText size={13} color={pixel.muted} center>
                {shown.description}
              </PixelText>
            </View>

            <View style={{ marginTop: scale(6) }}>
              <PixelButton
                label={owned ? '보유 중' : '구매하기'}
                disabled={owned}
                onPress={() => onPurchase(shown)}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
