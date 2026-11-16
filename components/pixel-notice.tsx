import { useCallback, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PixelButton, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export type PixelNoticeButton = {
  label: string;
  tone?: 'orange' | 'green' | 'ghost';
  onPress?: () => void;
};

export type PixelNoticeOptions = {
  title: string;
  message?: string;
  buttons?: PixelNoticeButton[];
};

const DEFAULT_BUTTONS: PixelNoticeButton[] = [{ label: '확인' }];

export function PixelNotice({ notice, onClose }: { notice: PixelNoticeOptions | null; onClose: () => void }) {
  const { scale } = useResponsive();
  const buttons = notice?.buttons?.length ? notice.buttons.slice(0, 2) : DEFAULT_BUTTONS;

  const press = (button: PixelNoticeButton) => {
    onClose();
    button.onPress?.();
  };

  return (
    <Modal visible={notice !== null} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24) }}>
        <Pressable
          accessibilityLabel="닫기"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(26, 21, 32, 0.45)' }}
        />
        {notice ? (
          <PixelPanel style={{ width: '100%', maxWidth: scale(320), gap: scale(12) }}>
            <PixelText size={17}>{notice.title}</PixelText>
            {notice.message ? (
              <PixelText size={13} color={pixel.muted}>
                {notice.message}
              </PixelText>
            ) : null}
            <View style={{ flexDirection: 'row', gap: scale(8) }}>
              {buttons.map((button, index) => (
                <View key={button.label} style={{ flex: 1 }}>
                  <PixelButton
                    label={button.label}
                    tone={button.tone ?? (buttons.length > 1 && index === 0 ? 'ghost' : 'orange')}
                    onPress={() => press(button)}
                  />
                </View>
              ))}
            </View>
          </PixelPanel>
        ) : null}
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export function usePixelNotice() {
  const [notice, setNotice] = useState<PixelNoticeOptions | null>(null);
  const close = useCallback(() => setNotice(null), []);
  const show = useCallback((options: PixelNoticeOptions) => setNotice(options), []);

  return { show, close, element: <PixelNotice notice={notice} onClose={close} /> };
}
