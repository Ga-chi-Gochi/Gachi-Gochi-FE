import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { PixelRatio, Platform, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { GyulsaeWear } from '@/components/gyulsae-wear';
import { PixelChip, PixelText } from '@/components/pixel/pixel-ui';
import { usePixelNotice } from '@/components/pixel-notice';
import { usePlayState } from '@/components/play-state';
import { StoreModeToggle } from '@/components/store-mode-toggle';
import { ShopItemSprite } from '@/components/store-product-image';
import { getShopItem } from '@/constants/content';
import { ISLAND_STAGE_ART, toIslandStage, type IslandStageId } from '@/constants/island-stages';
import { ISLAND_ZONES, type IslandZoneId } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import type { StorePreviewTab } from '@/constants/store-items';
import { WEAR_ART_PIXELS } from '@/constants/wear-art';
import { useResponsive } from '@/hooks/use-responsive';
import { snapArt } from '@/lib/pixel-snap';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const CHARACTER_SHARE = 0.7;
const GROUND_SHARE = 1 / 3;
const PREVIEW_SKY = '#CFEAF5';
const GRASS = { main: '#64B062', edge: '#3F9A5A' };
const GRASS_TUFTS: [number, number][] = [
  [8, 4],
  [21, 9],
  [33, 3],
  [70, 5],
  [83, 10],
  [92, 3],
];
const SHADOW_ROWS: [number, number][] = [
  [9, 30],
  [7, 31],
];
const SHADOW_COLOR = 'rgba(26,21,32,0.22)';
const COLLECTION_ROUTE = '/collection' as Href;
const CELL = 32;
const SEA_BLOCK_CELLS = 8;
const SEA_COLOR = '#32b5b3';
const VOLCANO_ART = { width: 4 * CELL, height: 3 * CELL };
const DECOR_SIZE = 24;
const DECOR_GAP = 4;
const DECOR_PER_ZONE = 3;
const ISLAND_PADDING = 8;
const ZONE_SHARE: Record<IslandZoneId, { x: number; y: number; w: number; h: number }> = {
  core: { x: 0.25, y: 0.55, w: 0.5, h: 0.25 },
  east: { x: 0.62, y: 0.25, w: 0.28, h: 0.3 },
  west: { x: 0.08, y: 0.35, w: 0.28, h: 0.25 },
  north: { x: 0.4, y: 0.06, w: 0.4, h: 0.16 },
  south: { x: 0.3, y: 0.8, w: 0.4, h: 0.1 },
};
const STAGE_IMAGES: Record<IslandStageId, number> = {
  1: require('@/assets/island-v3/stage1.png'),
  2: require('@/assets/island-v3/stage2.png'),
  3: require('@/assets/island-v3/stage3.png'),
};
const SEA_BLOCK_IMAGE = require('@/assets/island-v3/sea-plain-8x8.png');
const VOLCANO_IMAGE = require('@/assets/island-v3/volcano.png');
const crispStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

function zoneBox(stage: IslandStageId, zoneId: IslandZoneId) {
  const art = ISLAND_STAGE_ART[stage];
  const s = ZONE_SHARE[zoneId];
  return {
    left: s.x * art.width,
    top: s.y * art.height,
    width: s.w * art.width,
    height: s.h * art.height,
  };
}

function volcanoBox(stage: IslandStageId) {
  const art = ISLAND_STAGE_ART[stage];
  const [x0, , x1] = art.volcanoBox;
  const [ax, ay] = art.volcanoAnchor;
  const k = (x1 - x0) / VOLCANO_ART.width;
  const width = VOLCANO_ART.width * k;
  const height = VOLCANO_ART.height * k;
  return { left: ax - width / 2, top: ay - height, width, height };
}

function getIslandFit(stage: IslandStageId, width: number, height: number, padding: number) {
  const ratio = PixelRatio.get();
  const art = ISLAND_STAGE_ART[stage];
  const fitPx = Math.floor(
    Math.min(((width - padding * 2) * ratio) / art.cols, ((height - padding * 2) * ratio) / art.rows),
  );
  const cellPx = fitPx >= CELL ? Math.floor(fitPx / CELL) * CELL : Math.max(1, fitPx);
  const unit = cellPx / CELL / ratio;
  const left = Math.round(((width - art.width * unit) / 2) * ratio) / ratio;
  const top = Math.round(((height - art.height * unit) / 2) * ratio) / ratio;
  return { unit, left, top };
}

function StoreCharacterView({ size, height, selectedItemId }: { size: number; height: number; selectedItemId: string | null }) {
  const { growthStage, equipped } = usePlayState();
  const crispSize = snapArt(size, WEAR_ART_PIXELS);
  const dot = crispSize / WEAR_ART_PIXELS;
  const groundTop = Math.round(height * (1 - GROUND_SHARE));
  return (
    <View style={{ flex: 1, backgroundColor: PREVIEW_SKY }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: groundTop, bottom: 0, backgroundColor: GRASS.main }}>
        <View style={{ height: dot, backgroundColor: GRASS.edge }} />
        {GRASS_TUFTS.map(([x, y], index) => (
          <View
            key={index}
            style={{ position: 'absolute', left: `${x}%`, top: dot * y, width: dot, height: dot * 2, backgroundColor: GRASS.edge }}
          />
        ))}
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: crispSize, height: crispSize }}>
          {SHADOW_ROWS.map(([inset, row]) => (
            <View
              key={row}
              style={{
                position: 'absolute',
                left: dot * inset,
                right: dot * inset,
                top: dot * row,
                height: dot,
                backgroundColor: SHADOW_COLOR,
              }}
            />
          ))}
          <GyulsaeWear level={growthStage.level} size={crispSize} equipped={equipped} preview={selectedItemId} />
        </View>
      </View>
    </View>
  );
}
function StoreIslandView({
  width: initialWidth,
  height: initialHeight,
  selectedItemId,
}: {
  width: number;
  height: number;
  selectedItemId: string | null;
}) {
  const { scale } = useResponsive();
  const [measured, setMeasured] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const width = measured?.width ?? initialWidth;
  const height = measured?.height ?? initialHeight;
  const { islandStage, placed, unlockedZones } = usePlayState();
  const stage = toIslandStage(islandStage);
  const art = ISLAND_STAGE_ART[stage];
  const fit = getIslandFit(stage, width, height, scale(ISLAND_PADDING));
  const u = fit.unit;
  const seaBlock = SEA_BLOCK_CELLS * CELL * u;
  const seaLeft = fit.left - Math.ceil(fit.left / seaBlock) * seaBlock;
  const seaTop = fit.top - Math.ceil(fit.top / seaBlock) * seaBlock;
  const seaCols = Math.ceil((width - seaLeft) / seaBlock);
  const seaRows = Math.ceil((height - seaTop) / seaBlock);
  const volcano = volcanoBox(stage);
  const targetZone = selectedItemId ? getShopItem(selectedItemId)?.preferredZone : undefined;
  const targetOpen = targetZone ? unlockedZones.includes(targetZone) : false;
  const target = targetZone ? zoneBox(stage, targetZone) : null;
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
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      onLayout={(e) => {
        const next = e.nativeEvent.layout;
        if (next.width > 0 && next.height > 0 && (next.width !== width || next.height !== height)) {
          setMeasured({ width: next.width, height: next.height });
        }
      }}>
      <GestureDetector gesture={composed}>
        <Reanimated.View style={[{ width, height, backgroundColor: SEA_COLOR }, cameraStyle]}>
          {Array.from({ length: seaRows * seaCols }, (_, i) => (
            <Image
              key={`sea-${i}`}
              source={SEA_BLOCK_IMAGE}
              style={{
                position: 'absolute',
                left: seaLeft + (i % seaCols) * seaBlock,
                top: seaTop + Math.floor(i / seaCols) * seaBlock,
                width: seaBlock,
                height: seaBlock,
                ...crispStyle,
              }}
              contentFit="fill"
            />
          ))}
          <View
            style={{
              position: 'absolute',
              left: fit.left,
              top: fit.top,
              width: art.width * u,
              height: art.height * u,
            }}>
            <Image
              source={STAGE_IMAGES[stage]}
              style={{
                position: 'absolute',
                width: art.width * u,
                height: art.height * u,
                ...crispStyle,
              }}
              contentFit="fill"
            />
            <Image
              source={VOLCANO_IMAGE}
              style={{
                position: 'absolute',
                left: volcano.left * u,
                top: volcano.top * u,
                width: volcano.width * u,
                height: volcano.height * u,
              }}
              contentFit="fill"
            />
            {ISLAND_ZONES.map((zone) => {
              if (!unlockedZones.includes(zone.id)) {
                return null;
              }
              const box = zoneBox(stage, zone.id);
              const sprites = placed
                .filter((entry) => entry.zoneId === zone.id)
                .slice(0, DECOR_PER_ZONE)
                .flatMap((entry) => {
                  const item = getShopItem(entry.itemId);
                  return item ? [item.sprite] : [];
                });
              if (sprites.length === 0) {
                return null;
              }
              return (
                <View
                  key={`decor-${zone.id}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: (box.left + box.width * 0.35) * u,
                    top: (box.top + box.height * 0.45) * u,
                    flexDirection: 'row',
                    gap: DECOR_GAP * u,
                  }}>
                  {sprites.map((sprite, i) => (
                    <ShopItemSprite key={`${sprite}-${i}`} id={sprite} size={DECOR_SIZE * u} />
                  ))}
                </View>
              );
            })}
            {target ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: target.left * u,
                  top: target.top * u,
                  width: target.width * u,
                  height: target.height * u,
                  borderWidth: scale(targetOpen ? 3 : 2),
                  borderColor: targetOpen ? pixel.tangerine : pixel.white,
                  borderStyle: 'dashed',
                  backgroundColor: targetOpen ? 'rgba(255,138,61,0.22)' : 'rgba(26,21,32,0.28)',
                }}>
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: -width,
                    right: -width,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <PixelChip
                    label={targetOpen ? '여기에 놓여요' : '잠김'}
                    bg={targetOpen ? pixel.sand : pixel.ash}
                    color={targetOpen ? pixel.ink : pixel.white}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </Reanimated.View>
      </GestureDetector>
    </View>
  );
}

export function StorePreview({
  tab,
  modeActive,
  onToggleMode,
  selectedItemId = null,
}: {
  tab: StorePreviewTab;
  modeActive: boolean;
  onToggleMode: () => void;
  selectedItemId?: string | null;
}) {
  const { scale, width } = useResponsive();
  const notice = usePixelNotice();
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
        <StoreIslandView width={previewWidth} height={previewHeight} selectedItemId={selectedItemId} />
      ) : (
        <StoreCharacterView size={previewHeight * CHARACTER_SHARE} height={previewHeight} selectedItemId={selectedItemId} />
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
        {tab === 'island' ? <StoreModeToggle label="상품 설치 모드" active={modeActive} onPress={onToggleMode} /> : <View />}
        {tab === 'character' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(COLLECTION_ROUTE)}
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
      {notice.element}
    </View>
  );
}
