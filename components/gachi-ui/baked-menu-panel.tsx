import { Image } from 'expo-image';
import { Modal, Platform, Pressable, View } from 'react-native';

import { uiPopups } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

const ITEMS = [
  { key: 'profile', label: '내 정보' },
  { key: 'settings', label: '알림 설정' },
  { key: 'help', label: '도움말' },
  { key: 'logout', label: '로그아웃' },
] as const;

export type BakedMenuKey = (typeof ITEMS)[number]['key'];

type BakedMenuPanelProps = {
  open: boolean;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
  onSelect: (key: BakedMenuKey) => void;
};

/** menu-panel.png 통짜 에셋 + 세로 4등분 히트영역 */
export function BakedMenuPanel({ open, anchor, onClose, onSelect }: BakedMenuPanelProps) {
  const { scale } = useResponsive();
  const width = scale(100);
  const height = scale(82);

  if (!open || !anchor) {
    return null;
  }

  const left = Math.max(scale(8), anchor.x - width + scale(32));
  const top = anchor.y + scale(40);

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <View
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
          }}>
          <Image
            source={uiPopups.menuPanel}
            style={{ position: 'absolute', width, height, ...pixelImageStyle }}
            contentFit="fill"
          />
          {ITEMS.map((item, index) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => {
                onSelect(item.key);
                onClose();
              }}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: (height / ITEMS.length) * index,
                height: height / ITEMS.length,
              }}
            />
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
