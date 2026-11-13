import { Image, type ImageSource } from 'expo-image';
import { useState } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

const TILE = 64;

const waterDeep = require('@/assets/images/beach/water-deep.png') as ImageSource;
const grass = require('@/assets/images/beach/grass.png') as ImageSource;
const sand = require('@/assets/images/beach/sand.png') as ImageSource;
const shore = require('@/assets/images/beach/shore.png') as ImageSource;
const waterShallow = require('@/assets/images/beach/water-shallow.png') as ImageSource;
const egg = require('@/assets/pixel/gyulsae-egg.png') as ImageSource;
const juvenile = require('@/assets/pixel/gyulsae-juvenile.png') as ImageSource;
const adult = require('@/assets/pixel/gyulsae-adult.png') as ImageSource;

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

const TOP_SEA_FLEX = 1.15;
const TOTAL_FLEX = 5.75;
const DIVIDER_HEIGHT = 8;

export function useBeachTopSeaHeight() {
  const { height, scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const rest = Math.max(0, height - insets.top - scale(DIVIDER_HEIGHT));
  return insets.top + (rest * TOP_SEA_FLEX) / TOTAL_FLEX;
}

/** 와이어프레임 1페이지. 위 바다, 초원, 모래, 포말, 아래 바다 */
export function BeachHome({ onPet }: { onPet: () => void }) {
  const { scale } = useResponsive();
  const topSeaHeight = useBeachTopSeaHeight();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: topSeaHeight, overflow: 'hidden' }}>
        <TileFill source={waterDeep} />
      </View>
      <TileBand source={grass} flex={2.05} />
      <View style={{ height: scale(8), backgroundColor: pixel.grassDeep }} />
      <TileBand source={sand} flex={0.85} />
      <TileBand source={shore} flex={0.55} />
      <TileBand source={waterShallow} flex={1.15} />

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '27%',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: scale(36),
        }}>
        <View pointerEvents="none">
          <Image source={egg} style={{ width: scale(52), height: scale(52), ...pixelImageStyle }} contentFit="contain" />
        </View>
        <View pointerEvents="none">
          <Image source={juvenile} style={{ width: scale(64), height: scale(64), ...pixelImageStyle }} contentFit="contain" />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="귤새 쓰다듬기" onPress={onPet}>
          <Image source={adult} style={{ width: scale(84), height: scale(84), ...pixelImageStyle }} contentFit="contain" />
        </Pressable>
      </View>
    </View>
  );
}

function TileBand({ source, flex }: { source: ImageSource; flex: number }) {
  return (
    <View style={{ flex, overflow: 'hidden' }}>
      <TileFill source={source} />
    </View>
  );
}

function TileFill({ source }: { source: ImageSource }) {
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(TILE);
  const cols = Math.max(1, Math.ceil(width / TILE));
  const rows = Math.max(1, Math.ceil(height / TILE));

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(event) => {
        const next = Math.ceil(event.nativeEvent.layout.height);
        setHeight((current) => (current === next ? current : next));
      }}>
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {Array.from({ length: cols }, (_, col) => (
            <Image
              key={col}
              source={source}
              style={{ width: TILE, height: TILE, ...pixelImageStyle }}
              contentFit="fill"
            />
          ))}
        </View>
      ))}
    </View>
  );
}
