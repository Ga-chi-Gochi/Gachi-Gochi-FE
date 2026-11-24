import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { useResponsive } from '@/hooks/use-responsive';

/** 구멍 중심이 화면 오른쪽·아래 끝에서 얼마나 떨어져 있는지(이미 scale 이 적용된 값) */
export type TourTarget = { fromRight: number; fromBottom: number; size: number };

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

const fabOpen = require('@/assets/pixel/fab-open.png') as ImageSource;

const AREA = 212;
const FAB_SIZE = 100;
const LIFT = 20;
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
  { label: '걷기', href: '/walking', source: require('@/assets/pixel/icon-walk.png'), top: 5, left: 127, size: 70 },
  { label: '봉그깅', href: '/camera', source: require('@/assets/pixel/icon-bongging.png'), top: 41, left: 41, size: 70 },
  { label: '로컬 상점', href: '/store', source: require('@/assets/pixel/icon-local-shop.png'), top: 127, left: 5, size: 70 },
];

/** 홈 나침반 단계만 여기서 짚는다. 봉그깅·걷기는 가치 실천 팝업에서 이어진다. */
const COMPASS_TOUR = {
  number: 1,
  title: '나침반을 눌러 보세요',
  body: '가치 실천 창이 열려요',
} as const;

/**
 * 나침반과 펼쳐진 활동 버튼의 중심 위치(화면 오른쪽·아래 끝에서의 거리)와 크기. 이미 scale 이 적용된 값.
 * 가이드가 이 버튼들을 구멍으로 짚을 때 같은 계산을 쓰도록 밖으로 낸다.
 */
export function activityTarget(
  name: 'compass' | Action['label'],
  scale: (value: number) => number,
  insetBottom: number,
): TourTarget {
  const bottomOffset = Math.max(insetBottom, scale(12)) + scale(LIFT);
  if (name === 'compass') {
    return { fromRight: scale(12) + scale(FAB_SIZE) / 2, fromBottom: bottomOffset + scale(FAB_SIZE) / 2, size: scale(FAB_SIZE) };
  }
  const action = ACTIONS.find((entry) => entry.label === name) ?? ACTIONS[0];
  return {
    fromRight: scale(12) + scale(AREA) - scale(action.left + action.size / 2),
    fromBottom: bottomOffset + scale(AREA) - scale(action.top + action.size / 2),
    size: scale(action.size),
  };
}

type HomeActivityToggleProps = {
  /** false 면 튜토리얼이 진행 중이어도 안내를 숨긴다(온보딩 가이드를 다시 보는 동안) */
  tourEnabled?: boolean;
  /** true 면 사용자가 누르지 않아도 활동 버튼을 펼쳐 둔다(온보딩이 펼친 모습을 짚을 때) */
  expanded?: boolean;
  /** 튜토리얼이 아닐 때 나침반을 누르면 가치 실천 팝업을 연다 */
  onPracticeRequest?: () => void;
};

export function HomeActivityToggle({ tourEnabled = true, expanded = false, onPracticeRequest }: HomeActivityToggleProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const tutorial = useTutorial();
  const [open, setOpen] = useState(false);
  // 나침반 단계만 FAB 위에서 안내. 봉그깅·걷기는 팝업이 맡는다.
  const compassTour = tourEnabled && tutorial.step === 'compass';
  const tourBusy = tourEnabled && tutorial.step != null;
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

  const bottomOffset = Math.max(insets.bottom, scale(12)) + scale(LIFT);

  // 부모(온보딩)가 펼쳐 두라고 하거나, 사용자가 연 상태면 펼친다
  const wantOpen = expanded || open;
  useEffect(() => {
    if (wantOpen) {
      play(true);
    } else if (walk.value > 0) {
      play(false);
    }
    // play 는 렌더마다 새로 만들어지는 값이라 wantOpen 이 바뀔 때만 돌린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantOpen]);

  const pressAction = (action: Action) => {
    if (tourBusy) {
      return;
    }
    go(action.href);
  };

  const pressCompass = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (compassTour) {
      // 평소와 같이 가치 실천 팝업을 연 뒤, 봉그깅 안내로 넘어간다
      onPracticeRequest?.();
      tutorial.goTo('bongging');
      return;
    }
    if (tourBusy) {
      return;
    }
    if (onPracticeRequest) {
      onPracticeRequest();
      return;
    }
    const next = !open;
    setOpen(next);
    play(next);
  };

  const target = compassTour ? activityTarget('compass', scale, insets.bottom) : null;

  return (
    <>
      {compassTour && target ? (
        <>
          {/* 구멍 밖 터치를 막는다. 토글(zIndex 40) 아래, 헤더(20) 위 */}
          <View onStartShouldSetResponder={() => true} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 38 }} />
          <TutorialOverlay
            step={COMPASS_TOUR.number}
            title={COMPASS_TOUR.title}
            body={COMPASS_TOUR.body}
            hole={(box) => ({
              centerX: box.width - target.fromRight,
              centerY: box.height - target.fromBottom,
              radius: target.size / 2 + scale(8),
            })}
            placement="above"
            tailFromRight={target.fromRight}
            blockOutside={false}
            onSkip={tutorial.skip}
          />
        </>
      ) : null}
      {open && !tourBusy ? (
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
          bottom: bottomOffset,
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
            interactive={!tourBusy && open}
            onPress={() => pressAction(action)}
          />
        );
      })}

      <Animated.View style={[{ position: 'absolute', right: 0, bottom: 0 }, compassStyle]}>
        <ImageButton
          label={open ? '활동 닫기' : '활동 열기'}
          source={fabOpen}
          size={scale(FAB_SIZE)}
          disabled={tourBusy && !compassTour}
          onPress={pressCompass}
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
  disabled = false,
  onPress,
}: {
  label: string;
  source: ImageSource;
  size: number;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
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
