import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { usePlayState } from '@/components/play-state';

const MIN_ZOOM = 0.62;
const MAX_ZOOM = 2.8;

const IslandCameraContext = createContext<StyleProp<ViewStyle>>(null);

export function useIslandCameraStyle() {
  return useContext(IslandCameraContext);
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

/** 섬과 바다만 핀치로 확대·축소한다. 줄어든 자리는 뒤의 깊은 바다가 채운다. */
export function IslandCamera({ children }: { children: ReactNode }) {
  const { zoneUnlockReveal, pendingPlaceItemId } = usePlayState();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startZoom = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const frameRef = useRef({ width: 0, height: 0 });
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
      if (locked.value || width.value === 0) {
        return;
      }
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startZoom.value * event.scale));
      const clamped = clampPan(next, tx.value, ty.value, width.value, height.value);
      zoom.value = next;
      tx.value = clamped.x;
      ty.value = clamped.y;
      if (onWeb) {
        runOnJS(publishWeb)(next, clamped.x, clamped.y);
      }
    });

  const pan = Gesture.Pan()
    .minDistance(12)
    .averageTouches(true)
    .onBegin(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((event) => {
      if (locked.value || width.value === 0) {
        return;
      }
      const clamped = clampPan(zoom.value, startTx.value + event.translationX, startTy.value + event.translationY, width.value, height.value);
      tx.value = clamped.x;
      ty.value = clamped.y;
      if (onWeb) {
        runOnJS(publishWeb)(zoom.value, clamped.x, clamped.y);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));
  const cameraStyle = onWeb
    ? { transform: [{ translateX: webCamera.x }, { translateY: webCamera.y }, { scale: webCamera.zoom }] }
    : animatedStyle;

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
      setWebCamera({ zoom: next, x: clamped.x, y: clamped.y });
    };
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => window.removeEventListener('wheel', onWheel, { capture: true });
  }, [height, locked, setWebCamera, tx, ty, width, zoom]);

  return (
    <IslandCameraContext.Provider value={cameraStyle as StyleProp<ViewStyle>}>
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
          <View collapsable={false} style={{ position: 'absolute', top: 0, width: windowWidth, height: windowHeight }} />
        </GestureDetector>
        {children}
      </View>
    </IslandCameraContext.Provider>
  );
}
