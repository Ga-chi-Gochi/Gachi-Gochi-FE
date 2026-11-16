import { type ComponentRef, memo, type ReactNode, useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';

const IS_WEB = Platform.OS === 'web';

export type FoamFrame = {
  offset: Animated.Value;
  opacity: Animated.Value;
  current: () => { offset: number; opacity: number };
  set: (offset: number, opacity: number) => void;
};

export function createFoamFrame(): FoamFrame {
  const state = { offset: 0, opacity: 1 };
  const offset = new Animated.Value(0);
  const opacity = new Animated.Value(1);
  return {
    offset,
    opacity,
    current: () => state,
    set: (nextOffset, nextOpacity) => {
      const offsetChanged = nextOffset !== state.offset;
      const opacityChanged = nextOpacity !== state.opacity;
      state.offset = nextOffset;
      state.opacity = nextOpacity;
      if (offsetChanged) {
        offset.setValue(nextOffset);
      }
      if (opacityChanged) {
        opacity.setValue(nextOpacity);
      }
    },
  };
}

const ORIGIN = { position: 'absolute', left: 0, top: 0, width: 0, height: 0 } as const;

function useWebFoam(frame: FoamFrame) {
  const ref = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    if (!IS_WEB) {
      return;
    }
    const node = ref.current as unknown as HTMLElement | null;
    if (!node?.style) {
      return;
    }
    const apply = () => {
      const { offset, opacity } = frame.current();
      node.style.transform = `translate3d(0, ${offset}px, 0)`;
      node.style.opacity = String(opacity);
    };
    apply();
    const offsetListener = frame.offset.addListener(apply);
    const opacityListener = frame.opacity.addListener(apply);
    return () => {
      frame.offset.removeListener(offsetListener);
      frame.opacity.removeListener(opacityListener);
    };
  }, [frame]);

  return ref;
}

export const FoamSegment = memo(function FoamSegment({ frame, children }: { frame: FoamFrame; children: ReactNode }) {
  const webRef = useWebFoam(frame);
  if (IS_WEB) {
    return (
      <View ref={webRef} pointerEvents="none" style={ORIGIN}>
        {children}
      </View>
    );
  }
  return (
    <Animated.View pointerEvents="none" style={[ORIGIN, { opacity: frame.opacity, transform: [{ translateY: frame.offset }] }]}>
      {children}
    </Animated.View>
  );
});
