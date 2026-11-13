import { type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PixelText } from '@/components/pixel/pixel-ui';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type HomeSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** 홈에서 쓰는 짧은 하단 시트. 프로필, 설정, 가방, 준비 중 */
export function HomeSheet({ open, title, onClose, children }: HomeSheetProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const drag = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationY > 48) onClose();
    });

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="시트 닫기"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(26,21,32,0.35)' }}
        />
        <GestureDetector gesture={drag}>
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: pixel.panel,
              borderTopWidth: scale(pixel.border),
              borderLeftWidth: scale(pixel.border),
              borderRightWidth: scale(pixel.border),
              borderColor: pixel.ink,
              paddingHorizontal: scale(16),
              paddingTop: scale(8),
              paddingBottom: Math.max(insets.bottom, scale(16)),
              gap: scale(12),
            }}>
            <View style={{ alignItems: 'center', paddingVertical: scale(4) }}>
              <View
                style={{
                  width: scale(32),
                  height: scale(4),
                  backgroundColor: pixel.ink,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <PixelText size={16}>{title}</PixelText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                onPress={onClose}
                style={({ pressed }) => ({
                  minWidth: scale(44),
                  minHeight: scale(44),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? pixel.sand : pixel.white,
                  borderWidth: scale(2),
                  borderColor: pixel.ink,
                  paddingHorizontal: scale(12),
                })}>
                <PixelText size={13}>닫기</PixelText>
              </Pressable>
            </View>
            {children}
          </View>
        </GestureDetector>
      </View>
    </Modal>
  );
}
