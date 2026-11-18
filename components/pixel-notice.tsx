import { useCallback, useState } from 'react';
import { Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  PixelImageButton,
  PixelPopupActions,
  PixelPopupButton,
  PixelPopupFrame,
  PixelPopupMessage,
  PixelPopupOverlay,
  PixelPopupTitle,
} from '@/components/pixel-popup';

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

const CONFIRM_LABEL = '확인';

export function PixelNotice({ notice, onClose }: { notice: PixelNoticeOptions | null; onClose: () => void }) {
  const buttons = notice?.buttons?.length ? notice.buttons.slice(0, 2) : null;

  const press = (button?: PixelNoticeButton) => {
    onClose();
    button?.onPress?.();
  };

  const confirmOnly = !buttons || (buttons.length === 1 && buttons[0].label === CONFIRM_LABEL);

  return (
    <Modal visible={notice !== null} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PixelPopupOverlay onBackdropPress={onClose}>
          {notice ? (
            <PixelPopupFrame>
              <PixelPopupTitle>{notice.title}</PixelPopupTitle>
              {notice.message ? <PixelPopupMessage>{notice.message}</PixelPopupMessage> : null}
              <PixelPopupActions>
                {confirmOnly || !buttons ? (
                  <PixelImageButton kind="confirm" onPress={() => press(buttons?.[0])} />
                ) : (
                  buttons.map((button, index) => (
                    <PixelPopupButton
                      key={button.label}
                      label={button.label}
                      tone={button.tone === 'ghost' || (!button.tone && buttons.length > 1 && index === 0) ? 'beige' : 'green'}
                      onPress={() => press(button)}
                    />
                  ))
                )}
              </PixelPopupActions>
            </PixelPopupFrame>
          ) : null}
        </PixelPopupOverlay>
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
