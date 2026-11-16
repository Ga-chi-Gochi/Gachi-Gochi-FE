import { Image, type ImageSource } from 'expo-image';
import { type ComponentRef, memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

const IS_WEB = Platform.OS === 'web';
const pixelImageStyle = IS_WEB ? ({ imageRendering: 'pixelated' } as const) : undefined;

export type SheetFrame = {
  col: Animated.Value;
  row: Animated.Value;
  current: () => { col: number; row: number };
  set: (col: number, row: number) => void;
};

export function createSheetFrame(): SheetFrame {
  const state = { col: 0, row: 0 };
  const col = new Animated.Value(0);
  const row = new Animated.Value(0);
  return {
    col,
    row,
    current: () => state,
    set: (nextCol, nextRow) => {
      const colChanged = nextCol !== state.col;
      const rowChanged = nextRow !== state.row;
      state.col = nextCol;
      state.row = nextRow;
      if (colChanged) {
        col.setValue(nextCol);
      }
      if (rowChanged) {
        row.setValue(nextRow);
      }
    },
  };
}

type SheetSpriteProps = {
  source: ImageSource;
  cols: number;
  rows: number;
  size: number;
  frame: SheetFrame;
  style?: StyleProp<ViewStyle>;
};

function useWebSheetTransform(frame: SheetFrame, size: number) {
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
      const { col, row } = frame.current();
      node.style.transform = `translate(${-col * size}px, ${-row * size}px)`;
    };
    apply();
    const colListener = frame.col.addListener(apply);
    const rowListener = frame.row.addListener(apply);
    return () => {
      frame.col.removeListener(colListener);
      frame.row.removeListener(rowListener);
    };
  }, [frame, size]);

  return ref;
}

export const SheetSprite = memo(function SheetSprite({ source, cols, rows, size, frame, style }: SheetSpriteProps) {
  const width = cols * size;
  const height = rows * size;
  const webRef = useWebSheetTransform(frame, size);
  const nativeOffset = useMemo(
    () => (IS_WEB ? null : { x: Animated.multiply(frame.col, -size), y: Animated.multiply(frame.row, -size) }),
    [frame, size],
  );
  const image = <Image source={source} transition={0} contentFit="fill" style={{ width, height, ...pixelImageStyle }} />;

  return (
    <View pointerEvents="none" style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
      {nativeOffset ? (
        <Animated.View style={{ width, height, transform: [{ translateX: nativeOffset.x }, { translateY: nativeOffset.y }] }}>{image}</Animated.View>
      ) : (
        <View ref={webRef} style={{ width, height }}>
          {image}
        </View>
      )}
    </View>
  );
});
