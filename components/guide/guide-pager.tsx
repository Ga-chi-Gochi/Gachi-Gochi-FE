import { type ReactNode, useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { useReduceMotion } from '@/hooks/use-reduce-motion';

type GuidePagerProps = {
  index: number;
  width: number;
  height: number;
  onIndexChange: (index: number) => void;
  children: ReactNode[];
};

const SETTLE_MS = 520;
const REACHED = 2;
const IDLE_MS = 140;

/**
 * 가로 스와이프로 넘기는 가이드 슬라이더. 버튼은 index 를 바꿔 같은 페이지로 부드럽게 보낸다.
 * 이동 중에 들어오는 스크롤 끝 신호는 목적지에 닿기 전까지 무시한다(웹에서 마지막 장으로 튀던 문제).
 */
export function GuidePager({ index, width, height, onIndexChange, children }: GuidePagerProps) {
  const reduceMotion = useReduceMotion();
  const scroller = useRef<{ scrollTo: (options: { x?: number; animated?: boolean }) => void } | null>(null);
  const indexRef = useRef(index);
  const offset = useRef(0);
  const target = useRef<number | null>(null);
  const previous = useRef(index);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastX = useRef(0);

  useEffect(() => {
    indexRef.current = index;
    const x = width * index;
    const moved = previous.current !== index;
    previous.current = index;
    if (Math.abs(offset.current - x) < REACHED) {
      target.current = null;
      return;
    }
    target.current = x;
    scroller.current?.scrollTo({ x, animated: moved && !reduceMotion });
    const timer = setTimeout(
      () => {
        target.current = null;
        offset.current = x;
        // 이동 도중 다른 힘에 밀려 목적지에 못 닿았으면 의도한 장으로 맞춘다
        if (Math.abs(lastX.current - x) >= REACHED) {
          scroller.current?.scrollTo({ x, animated: false });
        }
      },
      moved && !reduceMotion ? SETTLE_MS : 80,
    );
    return () => clearTimeout(timer);
  }, [index, width, reduceMotion]);

  const settle = (x: number) => {
    if (width <= 0) {
      return;
    }
    if (target.current !== null) {
      if (Math.abs(x - target.current) < REACHED) {
        offset.current = x;
        target.current = null;
      }
      return;
    }
    offset.current = x;
    const next = Math.round(x / width);
    const clamped = Math.min(children.length - 1, Math.max(0, next));
    if (clamped !== indexRef.current) {
      onIndexChange(clamped);
    }
  };

  useEffect(
    () => () => {
      if (idle.current) {
        clearTimeout(idle.current);
      }
    },
    [],
  );

  return (
    <ScrollView
      ref={(instance) => {
        scroller.current = instance;
      }}
      horizontal
      pagingEnabled
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      directionalLockEnabled
      scrollEventThrottle={16}
      // 앱은 모멘텀이 끝날 때, 웹은 스크롤이 멈춘 뒤 잠깐 있다가 같은 곳에서 페이지를 확정한다
      onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.x)}
      onScroll={(event) => {
        const x = event.nativeEvent.contentOffset.x;
        lastX.current = x;
        if (idle.current) {
          clearTimeout(idle.current);
        }
        idle.current = setTimeout(() => settle(x), IDLE_MS);
      }}
      style={{ width, height }}>
      {children.map((child, page) => {
        const hidden = page !== index;
        return (
          <View
            key={page}
            aria-hidden={hidden}
            accessibilityElementsHidden={hidden}
            importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
            style={{ width, height }}>
            {child}
          </View>
        );
      })}
    </ScrollView>
  );
}
