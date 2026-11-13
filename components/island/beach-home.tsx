import { Image, type ImageSource } from 'expo-image';
import { useState } from 'react';
import { Platform, Pressable, View, useWindowDimensions } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';

const TILE = 64;

const waterDeep = require('@/assets/images/beach/water-deep.png') as ImageSource;
const grass = require('@/assets/images/beach/grass.png') as ImageSource;
const grassDark = require('@/assets/images/beach/grass-dark.png') as ImageSource;
const sand = require('@/assets/images/beach/sand.png') as ImageSource;
const shore = require('@/assets/images/beach/shore.png') as ImageSource;
const waterShallow = require('@/assets/images/beach/water-shallow.png') as ImageSource;
const egg = require('@/assets/pixel/gyulsae-egg.png') as ImageSource;
const juvenile = require('@/assets/pixel/gyulsae-juvenile.png') as ImageSource;
const adult = require('@/assets/pixel/gyulsae-adult.png') as ImageSource;

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

/** 와이어프레임 1페이지. 위 바다, 초원, 모래, 포말, 아래 바다 */
export function BeachHome({ onPet }: { onPet: () => void }) {
  const { scale } = useResponsive();

  return (
    <View style={{ flex: 1 }}>
      <TileBand source={waterDeep} flex={1.15} />
      <TileBand source={grass} flex={1.7} />
      <TileBand source={grassDark} flex={0.55} />
      <TileBand source={sand} flex={0.8} />
      <TileBand source={shore} height={TILE} />
      <TileBand source={waterShallow} flex={1.25} />

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '32%',
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

function TileBand({ source, flex, height }: { source: ImageSource; flex?: number; height?: number }) {
  return (
    <View style={{ flex, height, overflow: 'hidden' }}>
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
