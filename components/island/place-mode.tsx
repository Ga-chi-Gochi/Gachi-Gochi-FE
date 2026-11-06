import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelChip, PixelText } from '@/components/pixel/pixel-ui';
import { getShopItem } from '@/constants/content';
import type { IslandZoneId } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

/** 배치 모드 상단 가이드 바 */
export function PlaceGuideBanner({
  itemId,
  preferredZoneName,
  onCancel,
}: {
  itemId: string;
  preferredZoneName?: string;
  onCancel: () => void;
}) {
  const { scale } = useResponsive();
  const item = getShopItem(itemId);
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  if (!item) {
    return null;
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        paddingHorizontal: scale(10),
        paddingVertical: scale(8),
        backgroundColor: pixel.panel,
        borderWidth: scale(pixel.border),
        borderColor: pixel.ink,
      }}>
      <Animated.View
        style={{
          transform: [
            {
              translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }),
            },
          ],
        }}>
        <PixelSprite id={item.sprite} size={scale(28)} />
      </Animated.View>
      <View style={{ flex: 1, gap: scale(2) }}>
        <PixelText size={13}>{item.name} 배치하기</PixelText>
        <PixelText size={11} color={pixel.muted}>
          {preferredZoneName
            ? `빛나는 구역(${preferredZoneName})을 탭하거나, 다른 열린 땅을 골라요`
            : '빛나는 열린 땅을 탭해서 심어요'}
        </PixelText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="배치 취소"
        onPress={onCancel}
        style={{
          paddingHorizontal: scale(10),
          paddingVertical: scale(8),
          borderWidth: scale(2),
          borderColor: pixel.ink,
          backgroundColor: pixel.white,
        }}>
        <PixelText size={11}>취소</PixelText>
      </Pressable>
    </View>
  );
}

/** 구역 위에 올려 두는 탭 타깃 + 추천 펄스 */
export function PlaceZoneTarget({
  left,
  top,
  width,
  height,
  preferred,
  locked,
  onPress,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  preferred: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const { scale } = useResponsive();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (locked || !preferred) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [locked, preferred, pulse]);

  if (locked) {
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          backgroundColor: 'rgba(26,21,32,0.28)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <PixelChip label="잠김" bg={pixel.ash} />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={preferred ? '추천 구역에 배치' : '이 구역에 배치'}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        borderWidth: scale(preferred ? 3 : 2),
        borderColor: preferred ? pixel.tangerine : pixel.white,
        borderStyle: 'dashed',
        backgroundColor: preferred ? 'rgba(255,138,61,0.22)' : 'rgba(255,253,248,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Animated.View
        style={
          preferred
            ? {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
                transform: [
                  {
                    scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }),
                  },
                ],
              }
            : undefined
        }>
        <PixelChip label={preferred ? '추천 · 탭' : '탭해서 심기'} bg={preferred ? pixel.sand : pixel.white} />
      </Animated.View>
    </Pressable>
  );
}

/** 맵에 막 심어진 아이템 드롭 애니 */
export function PlacedDecorDrop({
  sprite,
  size,
  onDone,
}: {
  sprite: Parameters<typeof PixelSprite>[0]['id'];
  size: number;
  onDone?: () => void;
}) {
  const [drop] = useState(() => new Animated.Value(0));
  const [spark] = useState(() => new Animated.Value(0));

  useEffect(() => {
    drop.setValue(0);
    spark.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(drop, {
          toValue: 1.15,
          duration: 380,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        }),
        Animated.timing(drop, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]),
      Animated.timing(spark, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onDone?.();
      }
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [drop, onDone, spark]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <Animated.View
            key={`spark-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 6,
              height: 6,
              backgroundColor: i % 2 === 0 ? pixel.tangerine : pixel.sand,
              opacity: spark.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
              transform: [
                {
                  translateX: spark.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos(angle) * size * 0.7],
                  }),
                },
                {
                  translateY: spark.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.sin(angle) * size * 0.7],
                  }),
                },
              ],
            }}
          />
        );
      })}
      <Animated.View
        style={{
          opacity: drop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
          transform: [
            {
              translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.9, 0] }),
            },
            { scale: drop },
          ],
        }}>
        <PixelSprite id={sprite} size={size} />
      </Animated.View>
    </View>
  );
}

export function PlaceSuccessToast({
  itemName,
  zoneName,
  zoneId: _zoneId,
}: {
  itemName: string;
  zoneName: string;
  zoneId: IslandZoneId;
}) {
  const { scale } = useResponsive();
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(appear, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(appear, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [appear]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        alignSelf: 'center',
        top: scale(12),
        paddingHorizontal: scale(14),
        paddingVertical: scale(10),
        backgroundColor: pixel.leaf,
        borderWidth: scale(pixel.border),
        borderColor: pixel.ink,
        opacity: appear,
        transform: [
          {
            translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
          },
        ],
      }}>
      <PixelText size={13} color={pixel.white} center>
        {itemName} → {zoneName}에 심었어요!
      </PixelText>
    </Animated.View>
  );
}
