import { Modal, Pressable, View } from 'react-native';

import { PixelButton, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import { COLLECTION_HELP_TEXT } from '@/constants/collection';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function CollectionHelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { scale } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24) }}>
        <Pressable
          accessibilityLabel="닫기"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(26, 21, 32, 0.45)' }}
        />
        <PixelPanel style={{ width: '100%', maxWidth: scale(360), gap: scale(12) }}>
          <PixelText size={18}>도감이란?</PixelText>
          <PixelText size={13} color={pixel.muted}>
            {COLLECTION_HELP_TEXT}
          </PixelText>
          <PixelButton label="알겠어요" onPress={onClose} />
        </PixelPanel>
      </View>
    </Modal>
  );
}
