import { Image } from 'expo-image';
import { Alert, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { PixelText } from '@/components/pixel/pixel-ui';
import { StoreModeToggle } from '@/components/store-mode-toggle';
import { art } from '@/constants/art';
import { pixel } from '@/constants/pixel-theme';
import type { StorePreviewTab } from '@/constants/store-items';
import { useResponsive } from '@/hooks/use-responsive';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function StoreCharacterView({ size }: { size: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={art.idle} style={{ width: size, height: size }} contentFit="contain" />
    </View>
  );
}

function StoreIslandView({ width, height }: { width: number; height: number }) {
  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startZoom = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startZoom.value * e.scale));
      const maxX = ((next - 1) * width) / 2;
      const maxY = ((next - 1) * height) / 2;
      zoom.value = next;
      tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
      ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
    });

  const pan = Gesture.Pan()
    .minDistance(8)
    .averageTouches(true)
    .onBegin(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      const maxX = ((zoom.value - 1) * width) / 2 + width * 0.2;
      const maxY = ((zoom.value - 1) * height) / 2 + height * 0.2;
      tx.value = Math.min(maxX, Math.max(-maxX, startTx.value + e.translationX));
      ty.value = Math.min(maxY, Math.max(-maxY, startTy.value + e.translationY));
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Reanimated.View style={[{ width, height }, cameraStyle]}>
        <Image source={art.island} style={{ width, height }} contentFit="contain" />
      </Reanimated.View>
    </GestureDetector>
  );
}

export function StorePreview({
  tab,
  modeActive,
  onToggleMode,
}: {
  tab: StorePreviewTab;
  modeActive: boolean;
  onToggleMode: () => void;
}) {
  const { scale, width } = useResponsive();
  const previewWidth = width - scale(32) - scale(pixel.border) * 2;
  const previewHeight = scale(210);

  return (
    <View
      style={{
        height: previewHeight + scale(pixel.border) * 2,
        borderWidth: scale(pixel.border),
        borderColor: pixel.ink,
        backgroundColor: pixel.sky,
        overflow: 'hidden',
      }}>
      {tab === 'island' ? (
        <StoreIslandView width={previewWidth} height={previewHeight} />
      ) : (
        <StoreCharacterView size={scale(150)} />
      )}

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: scale(10),
          right: scale(10),
          bottom: scale(10),
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
        <StoreModeToggle
          label={tab === 'island' ? '상품 설치 모드' : '상품 착용 모드'}
          active={modeActive}
          onPress={onToggleMode}
        />
        {tab === 'character' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('준비 중', '캐릭터 바꾸기는 준비 중이에요.')}
            style={{
              paddingHorizontal: scale(10),
              paddingVertical: scale(6),
              borderWidth: scale(2),
              borderColor: pixel.ink,
              backgroundColor: pixel.white,
            }}>
            <PixelText size={11}>캐릭터 바꾸기</PixelText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
