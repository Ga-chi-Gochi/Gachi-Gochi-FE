import { Modal, View } from 'react-native';

import { WalkPopupFrame } from '@/components/walking/walk-popup-frame';
import { WalkText } from '@/components/walking/walk-text';
import { WalkButton } from '@/components/walking/walk-wide-button';
import { useResponsive } from '@/hooks/use-responsive';

export type StorePopupButton = { label: string; tone?: 'green' | 'beige'; onPress?: () => void };

export type StorePopupContent = { title: string; message?: string; buttons?: StorePopupButton[] };

export function StorePopup({ content, onClose }: { content: StorePopupContent | null; onClose: () => void }) {
  const { scale } = useResponsive();
  const buttons = content?.buttons?.length ? content.buttons : [{ label: '알았수다' }];

  return (
    <Modal visible={content !== null} transparent animationType="fade" onRequestClose={onClose}>
      {content ? (
        <WalkPopupFrame width={290}>
          <WalkText size={16} center>
            {content.title}
          </WalkText>
          {content.message ? (
            <WalkText size={12} regular center style={{ lineHeight: scale(18) }}>
              {content.message}
            </WalkText>
          ) : null}
          <View style={{ alignSelf: 'stretch', gap: scale(8) }}>
            {buttons.map((button) => (
              <WalkButton
                key={button.label}
                label={button.label}
                tone={button.tone ?? 'green'}
                height={38}
                textSize={14}
                onPress={() => {
                  onClose();
                  button.onPress?.();
                }}
              />
            ))}
          </View>
        </WalkPopupFrame>
      ) : null}
    </Modal>
  );
}
