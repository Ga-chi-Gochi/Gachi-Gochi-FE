import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type VolcanoBurstProps = {
  zoneName: string;
  onDone: () => void;
};

export function VolcanoBurst({ zoneName, onDone }: VolcanoBurstProps) {
  const { scale } = useResponsive();
  const [shake] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(0));
  const [phase, setPhase] = useState<'burst' | 'reveal'>('burst');

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]),
      { iterations: 10 },
    ).start();

    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0.35, duration: 220, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => setPhase('reveal'), 1400);
    return () => clearTimeout(timer);
  }, [flash, rise, shake]);

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
        backgroundColor: 'rgba(26,21,32,0.82)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(24),
      }}>
      <Animated.View
        style={{
          opacity: flash,
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: pixel.lava,
        }}
      />

      <Animated.View style={{ transform: [{ translateX }], alignItems: 'center', gap: scale(12) }}>
        <Animated.View
          style={{
            transform: [
              {
                translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
              },
              {
                scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }),
              },
            ],
          }}>
          <PixelSprite id={phase === 'burst' ? 'volcano-erupt' : 'volcano'} size={scale(120)} />
        </Animated.View>
        <Text style={{ color: pixel.white, fontSize: scale(28), fontWeight: '900', letterSpacing: 1 }}>
          {phase === 'burst' ? '쿠구구궁!!' : '화산이 잠잠해졌어요'}
        </Text>
      </Animated.View>

      {phase === 'reveal' ? (
        <PixelPanel style={{ marginTop: scale(20), width: '100%', maxWidth: scale(320), gap: scale(10) }}>
          <PixelText size={20} center>
            새 땅이 생겼어요!
          </PixelText>
          <PixelText size={14} center>
            {zoneName}
          </PixelText>
          <PixelText size={13} color={pixel.muted} center>
            화산이 잠잠해지며 땅이 이어졌어요. 인벤토리에서 아이템을 심어 보세요.
          </PixelText>
          <PixelButton label="섬 살펴보기" onPress={onDone} tone="orange" />
        </PixelPanel>
      ) : null}
    </View>
  );
}
