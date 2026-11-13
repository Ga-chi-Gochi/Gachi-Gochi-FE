import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type Action = {
  label: string;
  href: Href;
  icon: keyof typeof MaterialIcons.glyphMap;
  top: number;
  left: number;
  size: number;
};

/** 오른쪽 아래 둥근 묶음. 나침반이 걷기·봉그깅·로컬 상점을 연다 */
const ACTIONS: Action[] = [
  { label: '봉그깅', href: '/camera', icon: 'delete-outline', top: 4, left: 0, size: 52 },
  { label: '걷기', href: '/walking', icon: 'directions-walk', top: 0, left: 62, size: 52 },
  { label: '로컬 상점', href: '/store', icon: 'storefront', top: 64, left: 2, size: 52 },
];

export function HomeActivityToggle() {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const compass = scale(76);

  const go = (href: Href) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(false);
    router.push(href);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: scale(12),
        bottom: Math.max(insets.bottom, scale(12)),
        width: scale(156),
        height: scale(150),
        zIndex: 40,
      }}>
      {open
        ? ACTIONS.map((action) => (
            <RoundButton
              key={action.label}
              label={action.label}
              icon={action.icon}
              size={scale(action.size)}
              style={{ position: 'absolute', top: scale(action.top), left: scale(action.left) }}
              onPress={() => go(action.href)}
            />
          ))
        : null}

      <RoundButton
        label={open ? '활동 닫기' : '활동 열기'}
        icon="explore"
        size={compass}
        style={{ position: 'absolute', right: 0, bottom: 0 }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setOpen((current) => !current);
        }}
      />
    </View>
  );
}

function RoundButton({
  label,
  icon,
  size,
  onPress,
  style,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  size: number;
  onPress: () => void;
  style: object;
}) {
  const { scale } = useResponsive();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: scale(3),
        borderColor: pixel.ink,
        backgroundColor: '#E4C99A',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
        ...style,
      })}>
      <MaterialIcons name={icon} size={size * 0.42} color={pixel.ink} />
    </Pressable>
  );
}
