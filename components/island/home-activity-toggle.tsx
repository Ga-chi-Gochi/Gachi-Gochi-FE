import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

const fabOpen = require('@/assets/pixel/fab-open.png') as ImageSource;

const AREA = 160;
const FAB_SIZE = 76;
const FAB_CENTER = AREA - FAB_SIZE / 2;
const OPEN_MS = 280;
const CLOSE_MS = 200;
const STAGGER_MS = 48;

const openEase = Easing.out(Easing.cubic);
const closeEase = Easing.in(Easing.cubic);

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
  const walk = useSharedValue(0);
  const bongging = useSharedValue(0);
  const shop = useSharedValue(0);
  const compassScale = useSharedValue(1);
  const progresses = [walk, bongging, shop];

  const play = (next: boolean) => {
    progresses.forEach((progress, index) => {
      const order = next ? ACTIONS.length - 1 - index : index;
      progress.value = withDelay(
        order * STAGGER_MS,
        withTiming(next ? 1 : 0, { duration: next ? OPEN_MS : CLOSE_MS, easing: next ? openEase : closeEase }),
      );
    });
    compassScale.value = withSequence(
      withTiming(0.9, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }),
    );
  };

  const close = () => {
    setOpen(false);
    play(false);
  };

  const go = (href: Href) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    close();
    router.push(href);
  };

  const compassStyle = useAnimatedStyle(() => ({
    transform: [{ scale: compassScale.value }],
  }));

  return (
    <>
      {open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="활동 닫기"
          onPress={close}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 39 }}
        />
      ) : null}
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
      {ACTIONS.map((action, index) => {
        const centerX = action.left + action.size / 2;
        const centerY = action.top + action.size / 2;
        return (
          <FanButton
            key={action.label}
            label={action.label}
            source={action.source}
            size={scale(action.size)}
            top={scale(action.top)}
            left={scale(action.left)}
            fromX={scale(FAB_CENTER - centerX)}
            fromY={scale(FAB_CENTER - centerY)}
            progress={progresses[index]}
            interactive={open}
            onPress={() => go(action.href)}
          />
        );
      })}

      <Animated.View style={[{ position: 'absolute', right: 0, bottom: 0 }, compassStyle]}>
        <ImageButton
          label={open ? '활동 닫기' : '활동 열기'}
          source={fabOpen}
          size={scale(FAB_SIZE)}
          onPress={() => {
            const next = !open;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setOpen(next);
            play(next);
          }}
        />
      </Animated.View>
    </View>
    </>
  );
}

function FanButton({
  label,
  source,
  size,
  top,
  left,
  fromX,
  fromY,
  progress,
  interactive,
  onPress,
}: {
  label: string;
  source: ImageSource;
  size: number;
  top: number;
  left: number;
  fromX: number;
  fromY: number;
  progress: SharedValue<number>;
  interactive: boolean;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.25, 1], [0, 0.35, 1]),
    transform: [
      { translateX: (1 - progress.value) * fromX },
      { translateY: (1 - progress.value) * fromY },
      { scale: 0.72 + progress.value * 0.28 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents={interactive ? 'auto' : 'none'}
      accessibilityElementsHidden={!interactive}
      importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
      style={[{ position: 'absolute', top, left, width: size, height: size }, style]}>
      <ImageButton label={label} source={source} size={size} onPress={onPress} />
    </Animated.View>
  );
}

function ImageButton({
  label,
  source,
  size,
  onPress,
}: {
  label: string;
  source: ImageSource;
  size: number;
  onPress: () => void;
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
      })}>
      <Image source={source} style={{ width: size, height: size, ...pixelImageStyle }} contentFit="contain" />
    </Pressable>
  );
}
