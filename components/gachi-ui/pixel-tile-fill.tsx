import { Asset } from 'expo-asset';
import { Image, type ImageSource } from 'expo-image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type PixelTileFillProps = {
  source: ImageSource;
  /** 한 칸 논리 크기(pt). scale() 적용된 값을 넘긴다 */
  tileSize: number;
  /** 타일 없을 때 보이는 바탕색 */
  fallbackColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** 영역 안에 픽셀 타일을 반복으로 깐다. 웹은 CSS repeat, 네이티브는 개수 제한 격자. */
export function PixelTileFill({ source, tileSize, fallbackColor, style, children }: PixelTileFillProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [uri, setUri] = useState<string | null>(null);
  const ideal = Math.max(8, Math.round(tileSize));
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    let alive = true;
    const asset = Asset.fromModule(source as number);
    void asset.downloadAsync().then(() => {
      if (!alive) {
        return;
      }
      setUri(asset.localUri ?? asset.uri);
    });
    return () => {
      alive = false;
    };
  }, [source]);

  const cell = useMemo(() => {
    if (size.width <= 0 || size.height <= 0) {
      return ideal;
    }
    const cols = Math.ceil(size.width / ideal);
    const rows = Math.ceil(size.height / ideal);
    if (cols * rows <= 64) {
      return ideal;
    }
    return Math.ceil(Math.sqrt((size.width * size.height) / 64));
  }, [ideal, size.height, size.width]);

  const tiles = useMemo(() => {
    if (isWeb || size.width <= 0 || size.height <= 0) {
      return [] as { key: string; left: number; top: number }[];
    }
    const cols = Math.ceil(size.width / cell) + 1;
    const rows = Math.ceil(size.height / cell) + 1;
    const next: { key: string; left: number; top: number }[] = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        next.push({ key: `${row}-${col}`, left: col * cell, top: row * cell });
      }
    }
    return next;
  }, [cell, isWeb, size.height, size.width]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const webTileStyle = (
    isWeb && uri
      ? ({
          backgroundImage: `url("${uri}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${ideal}px ${ideal}px`,
          imageRendering: 'pixelated',
        } as ViewStyle)
      : null
  );

  return (
    <View
      style={[{ overflow: 'hidden', backgroundColor: fallbackColor }, webTileStyle, style]}
      onLayout={onLayout}>
      {tiles.map((tile) => (
        <Image
          key={tile.key}
          source={source}
          style={{
            position: 'absolute',
            left: tile.left,
            top: tile.top,
            width: cell,
            height: cell,
            ...pixelImageStyle,
          }}
          contentFit="fill"
        />
      ))}
      {children}
    </View>
  );
}
