import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { usePlayState } from '@/components/play-state';

const MIN_ZOOM = 0.62;
const MAX_ZOOM = 2.8;

type CameraRig = {
  zoom: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  web: { zoom: number; x: number; y: number } | null;
};

const IslandCameraContext = createContext<CameraRig | null>(null);

/** 배율 스타일은 섬을 그리는 컴포넌트에서 만든다. 부모 스타일을 넘기면 Expo Go에서 화면이 안 움직인다. */
export function useIslandCameraStyle() {
  const camera = useContext(IslandCameraContext);
  const fallbackZoom = useSharedValue(1);
  const fallbackX = useSharedValue(0);
  const fallbackY = useSharedValue(0);
  const zoom = camera?.zoom ?? fallbackZoom;
  const tx = camera?.tx ?? fallbackX;
  const ty = camera?.ty ?? fallbackY;
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));
  if (Platform.OS === 'web' && camera?.web) {
    return {
      transform: [{ translateX: camera.web.x }, { translateY: camera.web.y }, { scale: camera.web.zoom }],
    };
  }
  return animated;
}

function clampPan(zoom: number, x: number, y: number, width: number, height: number) {
  'worklet';
  const span = Math.abs(zoom - 1);
  const maxX = (span * width) / 2 + width * 0.1;
  const maxY = (span * height) / 2 + height * 0.1;
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

/** 섬과 바다만 핀치로 확대·축소한다. 버튼과 메뉴는 overlay로 제스처 밖에 둔다. */
export function IslandCamera({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  const { zoneUnlockReveal, pendingPlaceItemId } = usePlayState();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startZoom = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const width = useSharedValue(windowWidth);
  const height = useSharedValue(windowHeight);
  const frameRef = useRef({ width: windowWidth, height: windowHeight });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [webCamera, setWebCamera] = useState({ zoom: 1, x: 0, y: 0 });
  const onWeb = Platform.OS === 'web';
  const locked = useSharedValue(false);
  const gesturesLocked = Boolean(zoneUnlockReveal || pendingPlaceItemId);
  useEffect(() => {
    locked.value = gesturesLocked;
  }, [gesturesLocked, locked]);

  useEffect(() => {
    if (windowWidth <= 0 || windowHeight <= 0) {
      return;
    }
    width.value = windowWidth;
    height.value = windowHeight;
    frameRef.current = { width: windowWidth, height: windowHeight };
  }, [height, width, windowHeight, windowWidth]);

  const publishWeb = (nextZoom: number, nextX: number, nextY: number) => {
    setWebCamera({ zoom: nextZoom, x: nextX, y: nextY });
  };

  useEffect(() => {
    zoomRef.current = webCamera.zoom;
    panRef.current = { x: webCamera.x, y: webCamera.y };
  }, [webCamera]);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((event) => {
      if (locked.value) {
        return;
      }
      const frameW = width.value > 0 ? width.value : 1;
      const frameH = height.value > 0 ? height.value : 1;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startZoom.value * event.scale));
      const clamped = clampPan(next, tx.value, ty.value, frameW, frameH);
      zoom.value = next;
      tx.value = clamped.x;
      ty.value = clamped.y;
      if (onWeb) {
        runOnJS(publishWeb)(next, clamped.x, clamped.y);
      }
    });

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(12)
    .onBegin(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((event) => {
      if (locked.value) {
        return;
      }
      const frameW = width.value > 0 ? width.value : 1;
      const frameH = height.value > 0 ? height.value : 1;
      const clamped = clampPan(zoom.value, startTx.value + event.translationX, startTy.value + event.translationY, frameW, frameH);
      tx.value = clamped.x;
      ty.value = clamped.y;
      if (onWeb) {
        runOnJS(publishWeb)(zoom.value, clamped.x, clamped.y);
      }
    });

  const rig = { zoom, tx, ty, web: onWeb ? webCamera : null };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('button, a, [role="button"]')) {
        return;
      }
      const frame = frameRef.current;
      if (locked.value || frame.width === 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const dir = event.deltaY > 0 ? -1 : 1;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current + dir * 0.08));
      const clamped = clampPan(next, panRef.current.x, panRef.current.y, frame.width, frame.height);
      zoomRef.current = next;
      panRef.current = clamped;
      zoom.value = next;
      tx.value = clamped.x;
      ty.value = clamped.y;
      setWebCamera({ zoom: next, x: clamped.x, y: clamped.y });
    };
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => window.removeEventListener('wheel', onWheel, { capture: true });
  }, [height, locked, tx, ty, width, zoom]);

  return (
    <IslandCameraContext.Provider value={rig}>
      <View
        style={{ flex: 1, width: windowWidth, height: windowHeight }}
        onLayout={(event) => {
          const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
          if (nextWidth <= 0 || nextHeight <= 0) {
            return;
          }
          width.value = nextWidth;
          height.value = nextHeight;
          frameRef.current = { width: nextWidth, height: nextHeight };
        }}>
        <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
          <Animated.View collapsable={false} style={{ flex: 1, backgroundColor: 'transparent' }}>
            <View
              collapsable={false}
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'transparent' }}
            />
            {children}
          </Animated.View>
        </GestureDetector>
        {overlay ? (
          <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
            {overlay}
          </View>
        ) : null}
      </View>
    </IslandCameraContext.Provider>
  );
}
