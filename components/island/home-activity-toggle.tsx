import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

const fabOpen = require('@/assets/pixel/fab-open.png') as ImageSource;

const AREA = 160;
const FAB_SIZE = 76;

type Action = {
  label: string;
  href: Href;
  source: ImageSource;
  top: number;
  left: number;
  size: number;
};

const ACTIONS: Action[] = [
  { label: '걷기', href: '/walking', source: require('@/assets/pixel/icon-walk.png'), top: 4, left: 96, size: 52 },
  { label: '봉그깅', href: '/camera', source: require('@/assets/pixel/icon-bongging.png'), top: 31, left: 31, size: 52 },
  { label: '로컬 상점', href: '/store', source: require('@/assets/pixel/icon-local-shop.png'), top: 96, left: 4, size: 52 },
];

export function HomeActivityToggle() {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

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
        width: scale(AREA),
        height: scale(AREA),
        zIndex: 40,
      }}>
      {open
        ? ACTIONS.map((action) => (
            <ImageButton
              key={action.label}
              label={action.label}
              source={action.source}
              size={scale(action.size)}
              style={{ position: 'absolute', top: scale(action.top), left: scale(action.left) }}
              onPress={() => go(action.href)}
            />
          ))
        : null}

      <ImageButton
        label={open ? '활동 닫기' : '활동 열기'}
        source={fabOpen}
        size={scale(FAB_SIZE)}
        style={{ position: 'absolute', right: 0, bottom: 0 }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setOpen((current) => !current);
        }}
      />
    </View>
  );
}

function ImageButton({
  label,
  source,
  size,
  onPress,
  style,
}: {
  label: string;
  source: ImageSource;
  size: number;
  onPress: () => void;
  style: object;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        opacity: pressed ? 0.85 : 1,
        ...style,
      })}>
      <Image source={source} style={{ width: size, height: size, ...pixelImageStyle }} contentFit="contain" />
    </Pressable>
  );
}
