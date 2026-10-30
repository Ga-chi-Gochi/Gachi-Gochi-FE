import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PetCreature } from '@/components/island/pet-creature';
import {
  PlaceSuccessToast,
  PlaceZoneTarget,
  PlacedDecorDrop,
} from '@/components/island/place-mode';
import { IslandTerrain, type ExpandPhase } from '@/components/island/island-terrain';
import { WanderingCreature } from '@/components/island/wandering-creature';
import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelChip, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { getShopItem } from '@/constants/content';
import { zoneHitRect, walkPointsFromLand, ISLAND_GRID_W, ISLAND_GRID_H } from '@/constants/island-terrain';
import { ISLAND_ZONES, type IslandZoneId } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.8;

const STATIC_DECOR: {
  zone: IslandZoneId;
  id: 'house' | 'tree' | 'canola' | 'pebble';
  gx: number;
  gy: number;
  size: number;
  minStage: number;
}[] = [
  { zone: 'core', id: 'house', gx: 9.2, gy: 6.4, size: 26, minStage: 1 },
  { zone: 'core', id: 'tree', gx: 5.5, gy: 7.6, size: 20, minStage: 1 },
  { zone: 'core', id: 'canola', gx: 10.2, gy: 8.4, size: 14, minStage: 1 },
  { zone: 'west', id: 'tree', gx: 3.8, gy: 6.6, size: 22, minStage: 3 },
  { zone: 'west', id: 'tree', gx: 5.0, gy: 8.0, size: 16, minStage: 3 },
  { zone: 'east', id: 'pebble', gx: 12.2, gy: 7.8, size: 12, minStage: 2 },
  { zone: 'east', id: 'tree', gx: 12.8, gy: 6.2, size: 18, minStage: 2 },
  { zone: 'south', id: 'canola', gx: 7.0, gy: 10.4, size: 16, minStage: 5 },
  { zone: 'south', id: 'canola', gx: 9.2, gy: 10.8, size: 14, minStage: 5 },
  { zone: 'north', id: 'pebble', gx: 6.2, gy: 5.2, size: 12, minStage: 4 },
];

export function IslandMap({ highlightZoneId }: { highlightZoneId?: IslandZoneId | null }) {
  const { scale: rs } = useResponsive();
  const {
    growthStage,
    unlockedZones,
    placed,
    petCreature,
    pendingPlaceItemId,
    lastPlaced,
    placeDecor,
    acknowledgeLastPlaced,
    zoneUnlockReveal,
    acknowledgeZoneUnlock,
  } = usePlayState();

  const mapW = rs(320);
  const mapH = rs(300);
  const viewportH = rs(300);
  const cellW = mapW / ISLAND_GRID_W;
  const cellH = mapH / ISLAND_GRID_H;

  const [focusMode, setFocusMode] = useState(false);
  const [petting, setPetting] = useState(false);
  const [expandPhase, setExpandPhase] = useState<ExpandPhase>('idle');
  const [toastZone, setToastZone] = useState<{ name: string; id: IslandZoneId } | null>(null);

  const placing = Boolean(pendingPlaceItemId);
  const pendingItem = pendingPlaceItemId ? getShopItem(pendingPlaceItemId) : null;
  const preferredZoneId = pendingItem?.preferredZone ?? null;
  const expanding = Boolean(zoneUnlockReveal);
  const islandStage = useMemo(
    () => Math.max(1, ...unlockedZones.map((id) => ISLAND_ZONES.find((z) => z.id === id)?.stage ?? 1)),
    [unlockedZones],
  );

  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startZoom = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const locked = useSharedValue(false);

  const walkPoints = useMemo(
    () => walkPointsFromLand(unlockedZones, mapW, mapH),
    [mapH, mapW, unlockedZones],
  );

  const showFocusUI = focusMode && !placing && !expanding;

  useEffect(() => {
    locked.value = showFocusUI || petting || placing || expanding;
  }, [expanding, locked, petting, placing, showFocusUI]);

  useEffect(() => {
    if (!lastPlaced) {
      return;
    }
    const timer = setTimeout(() => acknowledgeLastPlaced(), 1800);
    return () => clearTimeout(timer);
  }, [acknowledgeLastPlaced, lastPlaced]);

  const terrainPhase: ExpandPhase = zoneUnlockReveal ? expandPhase : 'idle';

  /** 섬 안 화산 연출 시퀀스 — 팝업 없음 (setState는 타이머에서만) */
  useEffect(() => {
    if (!zoneUnlockReveal) {
      return;
    }
    const reveal = zoneUnlockReveal;
    const timers = [
      setTimeout(() => setExpandPhase('rumble'), 0),
      setTimeout(() => setExpandPhase('erupt'), 520),
      setTimeout(() => setExpandPhase('grow'), 1200),
      setTimeout(() => {
        setExpandPhase('done');
        setToastZone({ id: reveal.zoneId, name: reveal.zoneName });
        acknowledgeZoneUnlock();
      }, 2600),
      setTimeout(() => setToastZone(null), 4200),
    ];
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [acknowledgeZoneUnlock, zoneUnlockReveal]);

  const focusOn = (pos: { x: number; y: number }) => {
    if (placing || expanding) {
      return;
    }
    setFocusMode(true);
    const targetZoom = 2.2;
    const nextTx = (mapW / 2 - pos.x) * targetZoom;
    const nextTy = (mapH / 2 - pos.y) * targetZoom;
    zoom.value = withTiming(targetZoom, { duration: 380 });
    tx.value = withTiming(nextTx, { duration: 380 });
    ty.value = withTiming(nextTy, { duration: 380 });
  };

  const clampPan = (nextZoom: number, nextTx: number, nextTy: number) => {
    'worklet';
    const maxX = ((nextZoom - 1) * mapW) / 2 + mapW * 0.15;
    const maxY = ((nextZoom - 1) * mapH) / 2 + mapH * 0.15;
    return {
      x: Math.min(maxX, Math.max(-maxX, nextTx)),
      y: Math.min(maxY, Math.max(-maxY, nextTy)),
    };
  };

  const gesturesOff = placing || focusMode || expanding;

  const pinch = Gesture.Pinch()
    .enabled(!gesturesOff)
    .onBegin(() => {
      startZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      if (locked.value) {
        return;
      }
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startZoom.value * e.scale));
      zoom.value = next;
      const clamped = clampPan(next, tx.value, ty.value);
      tx.value = clamped.x;
      ty.value = clamped.y;
    });

  const pan = Gesture.Pan()
    .enabled(!gesturesOff)
    .minDistance(12)
    .averageTouches(true)
    .onBegin(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      if (locked.value) {
        return;
      }
      const clamped = clampPan(zoom.value, startTx.value + e.translationX, startTy.value + e.translationY);
      tx.value = clamped.x;
      ty.value = clamped.y;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }],
  }));

  const exitFocus = () => {
    setFocusMode(false);
    setPetting(false);
    zoom.value = withTiming(1, { duration: 320 });
    tx.value = withTiming(0, { duration: 320 });
    ty.value = withTiming(0, { duration: 320 });
  };

  const bumpZoom = (dir: 1 | -1) => {
    if (showFocusUI || placing || expanding) {
      return;
    }
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value + dir * 0.35));
    const maxX = ((next - 1) * mapW) / 2 + mapW * 0.15;
    const maxY = ((next - 1) * mapH) / 2 + mapH * 0.15;
    const nextTx = Math.min(maxX, Math.max(-maxX, tx.value));
    const nextTy = Math.min(maxY, Math.max(-maxY, ty.value));
    zoom.value = withTiming(next, { duration: 180 });
    tx.value = withTiming(nextTx, { duration: 180 });
    ty.value = withTiming(nextTy, { duration: 180 });
  };

  const decorByZone = useMemo(() => {
    const map = new Map<IslandZoneId, typeof placed>();
    for (const entry of placed) {
      const list = map.get(entry.zoneId) ?? [];
      list.push(entry);
      map.set(entry.zoneId, list);
    }
    return map;
  }, [placed]);

  return (
    <View style={{ width: mapW, height: viewportH, alignSelf: 'center' }}>
      <View
        style={{
          flex: 1,
          backgroundColor: pixel.sky,
          borderWidth: rs(pixel.border),
          borderColor: pixel.ink,
          overflow: 'hidden',
        }}>
        <GestureDetector gesture={composed}>
          <Reanimated.View style={[{ width: mapW, height: mapH }, cameraStyle]}>
            {/* 바다 물결 */}
            <View style={{ position: 'absolute', top: mapH * 0.1, left: rs(14), width: rs(28), height: rs(5), backgroundColor: '#B9E4F5', opacity: 0.75 }} />
            <View style={{ position: 'absolute', top: mapH * 0.22, right: rs(40), width: rs(20), height: rs(4), backgroundColor: '#B9E4F5', opacity: 0.55 }} />
            <View style={{ position: 'absolute', top: mapH * 0.82, right: rs(18), width: rs(34), height: rs(5), backgroundColor: '#B9E4F5', opacity: 0.65 }} />

            <IslandTerrain
              mapW={mapW}
              mapH={mapH}
              unlockedZones={unlockedZones}
              expandingZoneId={zoneUnlockReveal?.zoneId ?? null}
              expandPhase={terrainPhase}
              highlightZoneId={highlightZoneId}
            />

            {/* 고정 장식 */}
            {STATIC_DECOR.filter((d) => unlockedZones.includes(d.zone) && islandStage >= d.minStage).map((d, i) => (
              <View
                key={`static-${d.zone}-${i}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: d.gx * cellW - rs(d.size) / 2,
                  top: d.gy * cellH - rs(d.size) / 2,
                }}>
                <PixelSprite id={d.id} size={rs(d.size)} />
              </View>
            ))}

            {/* 배치한 아이템 */}
            {ISLAND_ZONES.map((zone) => {
              const hit = zoneHitRect(zone.id, mapW, mapH);
              const decor = decorByZone.get(zone.id) ?? [];
              if (decor.length === 0 || !unlockedZones.includes(zone.id)) {
                return null;
              }
              return (
                <View
                  key={`decor-${zone.id}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: hit.left + hit.width * 0.35,
                    top: hit.top + hit.height * 0.45,
                    flexDirection: 'row',
                    gap: rs(4),
                  }}>
                  {decor.slice(0, 3).map((entry) => {
                    const item = getShopItem(entry.itemId);
                    if (!item) {
                      return null;
                    }
                    const isFresh = lastPlaced?.itemId === entry.itemId;
                    const decorSize = rs(isFresh ? 28 : 22);
                    return isFresh ? (
                      <PlacedDecorDrop key={entry.itemId} sprite={item.sprite} size={decorSize} />
                    ) : (
                      <PixelSprite key={entry.itemId} id={item.sprite} size={decorSize} />
                    );
                  })}
                </View>
              );
            })}

            {placing
              ? ISLAND_ZONES.map((zone) => {
                  const hit = zoneHitRect(zone.id, mapW, mapH);
                  const open = unlockedZones.includes(zone.id);
                  return (
                    <PlaceZoneTarget
                      key={`place-${zone.id}`}
                      left={hit.left}
                      top={hit.top}
                      width={hit.width}
                      height={hit.height}
                      preferred={preferredZoneId === zone.id && open}
                      locked={!open}
                      onPress={() => {
                        if (!pendingPlaceItemId) {
                          return;
                        }
                        placeDecor(pendingPlaceItemId, zone.id);
                      }}
                    />
                  );
                })
              : null}

            {!showFocusUI && !placing && !expanding ? (
              <WanderingCreature growthStage={growthStage} walkPoints={walkPoints} onPress={focusOn} />
            ) : null}
          </Reanimated.View>
        </GestureDetector>

        {!showFocusUI && !placing && !expanding ? (
          <View style={{ position: 'absolute', top: rs(8), right: rs(8), gap: rs(6) }}>
            <ZoomBtn label="+" onPress={() => bumpZoom(1)} />
            <ZoomBtn label="−" onPress={() => bumpZoom(-1)} />
          </View>
        ) : null}

        {!showFocusUI && !placing && !expanding ? (
          <View style={{ position: 'absolute', left: rs(8), bottom: rs(8) }}>
            <PixelChip label="캐릭터를 탭 · 두 손가락으로 확대" bg={pixel.white} />
          </View>
        ) : null}

        {expanding ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: rs(10),
              right: rs(10),
              bottom: rs(12),
              paddingVertical: rs(8),
              paddingHorizontal: rs(12),
              backgroundColor: 'rgba(26,21,32,0.72)',
              borderWidth: rs(2),
              borderColor: pixel.ink,
              alignItems: 'center',
            }}>
            <PixelText size={12} color={pixel.white} center>
              {terrainPhase === 'rumble' || terrainPhase === 'erupt'
                ? '화산이 흔들려요…'
                : terrainPhase === 'grow'
                  ? '용암이 식으며 땅이 이어져요…'
                  : `${zoneUnlockReveal?.zoneName ?? ''}이(가) 붙었어요!`}
            </PixelText>
          </View>
        ) : null}

        {placing && pendingItem ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: rs(10),
              left: 0,
              right: 0,
              alignItems: 'center',
            }}>
            <View
              style={{
                paddingHorizontal: rs(12),
                paddingVertical: rs(8),
                backgroundColor: 'rgba(255,253,248,0.92)',
                borderWidth: rs(2),
                borderColor: pixel.ink,
                borderStyle: 'dashed',
                alignItems: 'center',
                gap: rs(4),
              }}>
              <PixelSprite id={pendingItem.sprite} size={rs(36)} />
              <PixelText size={11} center>
                땅을 탭해서 놓아요
              </PixelText>
            </View>
          </View>
        ) : null}

        {lastPlaced ? (
          <PlaceSuccessToast
            itemName={getShopItem(lastPlaced.itemId)?.name ?? '아이템'}
            zoneName={ISLAND_ZONES.find((z) => z.id === lastPlaced.zoneId)?.name ?? lastPlaced.zoneId}
            zoneId={lastPlaced.zoneId}
          />
        ) : null}

        {toastZone && !lastPlaced ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              alignSelf: 'center',
              top: rs(12),
              left: rs(24),
              right: rs(24),
              paddingHorizontal: rs(14),
              paddingVertical: rs(10),
              backgroundColor: pixel.leaf,
              borderWidth: rs(pixel.border),
              borderColor: pixel.ink,
              alignItems: 'center',
            }}>
            <PixelText size={13} color={pixel.white} center>
              {toastZone.name}이(가) 섬에 이어졌어요!
            </PixelText>
          </View>
        ) : null}

        {showFocusUI ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(26,21,32,0.28)',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: rs(12),
            }}>
            <View
              style={{
                width: '100%',
                maxWidth: rs(300),
                backgroundColor: pixel.panel,
                borderWidth: rs(pixel.border),
                borderColor: pixel.ink,
                paddingVertical: rs(14),
                paddingHorizontal: rs(10),
                alignItems: 'center',
                gap: rs(8),
              }}>
              <PixelText size={14} center>
                쓰담쓰담
              </PixelText>
              <PetCreature
                growthStage={growthStage}
                onPetComplete={() => void petCreature()}
                onPettingChange={setPetting}
              />
              <Pressable
                accessibilityRole="button"
                onPress={exitFocus}
                style={{
                  marginTop: rs(4),
                  paddingHorizontal: rs(16),
                  paddingVertical: rs(8),
                  borderWidth: rs(2),
                  borderColor: pixel.ink,
                  backgroundColor: pixel.white,
                }}>
                <PixelText size={13}>섬으로 돌아가기</PixelText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ZoomBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const { scale } = useResponsive();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        width: scale(34),
        height: scale(34),
        borderWidth: scale(2),
        borderColor: pixel.ink,
        backgroundColor: pixel.white,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <PixelText size={16}>{label}</PixelText>
    </Pressable>
  );
}
