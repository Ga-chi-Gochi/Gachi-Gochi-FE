import { useState } from 'react';
import { Modal, View } from 'react-native';

import { StoreProductImage } from '@/components/store-product-image';
import { WalkPopupFrame } from '@/components/walking/walk-popup-frame';
import { WalkText } from '@/components/walking/walk-text';
import { WalkButton } from '@/components/walking/walk-wide-button';
import type { StoreProduct } from '@/constants/store-items';
import { useResponsive } from '@/hooks/use-responsive';

export function StoreDetailSheet({
  product,
  owned,
  wear = null,
  blockedLabel,
  note,
  onClose,
  onPurchase,
  onWear,
}: {
  product: StoreProduct | null;
  owned: boolean;
  wear?: 'equip' | 'unequip' | null;
  blockedLabel?: string;
  note?: string;
  onClose: () => void;
  onPurchase: (product: StoreProduct) => void;
  onWear?: (product: StoreProduct) => void;
}) {
  const { scale } = useResponsive();
  const [shown, setShown] = useState<StoreProduct | null>(product);

  if (product && product !== shown) {
    setShown(product);
  }

  const action = () => {
    if (!shown) {
      return null;
    }
    if (blockedLabel) {
      return <WalkButton label={blockedLabel} disabled height={40} textSize={13} />;
    }
    if (wear && onWear) {
      return <WalkButton label={wear === 'unequip' ? '벗게' : '착용허게'} onPress={() => onWear(shown)} height={40} textSize={14} />;
    }
    if (owned) {
      return <WalkButton label="이미 이수다" disabled height={40} textSize={14} />;
    }
    const price = shown.kind === 'coin' ? shown.priceLabel : `🍊${shown.price}`;
    return <WalkButton label={`사게 ${price}`} onPress={() => onPurchase(shown)} height={40} textSize={14} />;
  };

  return (
    <Modal visible={product !== null} transparent animationType="fade" onRequestClose={onClose}>
      {shown ? (
        <WalkPopupFrame width={310}>
          <StoreProductImage product={shown} size={scale(104)} />
          <WalkText size={16} center>
            {shown.name}
          </WalkText>
          <WalkText size={12} regular center style={{ lineHeight: scale(18) }}>
            {shown.description}
          </WalkText>
          {note ? (
            <WalkText size={11} center>
              {note}
            </WalkText>
          ) : null}
          <View style={{ alignSelf: 'stretch', gap: scale(8) }}>
            {action()}
            <WalkButton label="닫게" tone="beige" onPress={onClose} height={36} textSize={13} />
          </View>
        </WalkPopupFrame>
      ) : null}
    </Modal>
  );
}
