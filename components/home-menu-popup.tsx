import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, View } from 'react-native';

import { usePixelNotice } from '@/components/pixel-notice';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

const MENU_ITEMS: { icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
  { icon: 'person', label: '프로필' },
  { icon: 'settings', label: '설정' },
  { icon: 'volume-up', label: '소리' },
];

export function HomeMenuPopup({ onClose }: { onClose: () => void }) {
  const { scale } = useResponsive();
  const buttonSize = scale(32);
  const notice = usePixelNotice();

  return (
    <View
      style={{
        elevation: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
        padding: scale(6),
        backgroundColor: pixel.panel,
        borderWidth: scale(2),
        borderColor: pixel.ink,
      }}>
      {MENU_ITEMS.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => notice.show({ title: '준비 중', message: `${item.label}은(는) 준비 중이에요.` })}
          style={({ pressed }) => ({
            width: buttonSize,
            height: buttonSize,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pixel.white,
            borderWidth: scale(2),
            borderColor: pixel.ink,
            opacity: pressed ? 0.8 : 1,
          })}>
          <MaterialIcons name={item.icon} size={scale(18)} color={pixel.ink} />
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="메뉴 닫기"
        onPress={onClose}
        hitSlop={4}
        style={({ pressed }) => ({
          width: scale(24),
          height: scale(24),
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}>
        <MaterialIcons name="close" size={scale(18)} color={pixel.ink} />
      </Pressable>
      {notice.element}
    </View>
  );
}
