/* eslint-disable react-hooks/refs -- PanResponder + Animated values are event-driven */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Text, View } from 'react-native';

import { growthSpriteId, PixelSprite } from '@/components/pixel/pixel-sprite';
import {
  PET_STROKE_IDLE_MS,
  PET_STROKE_MIN_DISTANCE,
  PET_STROKES_REQUIRED,
  PET_XP_REWARD,
} from '@/constants/creature-interaction';
import type { GrowthStage } from '@/constants/growth';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type PetCreatureProps = {
  growthStage: GrowthStage;
  onPetComplete: () => void;
  /** 쓰담 제스처 중 (맵 팬/핀치 잠금용) */
  onPettingChange?: (active: boolean) => void;
};

type HeartBurst = {
  id: number;
  anim: Animated.Value;
  driftX: number;
};

export function PetCreature({ growthStage, onPetComplete, onPettingChange }: PetCreatureProps) {
  const { scale } = useResponsive();
  const [strokes, setStrokes] = useState(0);
  const [floatXp, setFloatXp] = useState<number | null>(null);
  const [hearts, setHearts] = useState<HeartBurst[]>([]);
  const [dragging, setDragging] = useState(false);
  const pathSinceStrokeRef = useRef(0);
  const lastGestureRef = useRef({ dx: 0, dy: 0 });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registerStrokeRef = useRef<() => void>(() => undefined);
  const heartIdRef = useRef(0);
  const [bounce] = useState(() => new Animated.Value(1));
  const [wiggle] = useState(() => new Animated.Value(0));
  const [ripple] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [progressPulse] = useState(() => new Animated.Value(1));

  const clearIdle = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }, []);

  const scheduleIdleReset = useCallback(() => {
    clearIdle();
    idleTimer.current = setTimeout(() => setStrokes(0), PET_STROKE_IDLE_MS);
  }, [clearIdle]);

  useEffect(() => () => clearIdle(), [clearIdle]);

  const playRipple = useCallback(() => {
    ripple.setValue(0);
    Animated.timing(ripple, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [ripple]);

  const spawnHeart = useCallback(() => {
    const id = heartIdRef.current + 1;
    heartIdRef.current = id;
    const anim = new Animated.Value(0);
    const driftX = (Math.random() - 0.5) * scale(48);
    setHearts((current) => [...current.slice(-4), { id, anim, driftX }]);
    Animated.timing(anim, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setHearts((current) => current.filter((heart) => heart.id !== id));
      }
    });
  }, [scale]);

  const pulse = useCallback(() => {
    bounce.setValue(1);
    wiggle.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1.18, duration: 100, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0.96, duration: 90, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 1, duration: 110, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 90, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]),
    ]).start();
  }, [bounce, wiggle]);

  const completePet = useCallback(() => {
    clearIdle();
    setStrokes(0);
    setFloatXp(PET_XP_REWARD);
    pulse();
    playRipple();
    spawnHeart();
    spawnHeart();
    floatAnim.setValue(0);
    Animated.timing(floatAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPetComplete();
    setTimeout(() => setFloatXp(null), 850);
  }, [clearIdle, floatAnim, onPetComplete, playRipple, pulse, spawnHeart]);

  const registerStroke = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pulse();
    playRipple();
    spawnHeart();
    Animated.sequence([
      Animated.timing(progressPulse, { toValue: 1.2, duration: 90, useNativeDriver: true }),
      Animated.timing(progressPulse, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    setStrokes((current) => {
      const next = current + 1;
      if (next >= PET_STROKES_REQUIRED) {
        queueMicrotask(() => {
          completePet();
        });
        return 0;
      }
      scheduleIdleReset();
      return next;
    });
  }, [completePet, playRipple, progressPulse, pulse, scheduleIdleReset, spawnHeart]);

  useEffect(() => {
    registerStrokeRef.current = registerStroke;
  }, [registerStroke]);

  const onPettingChangeRef = useRef(onPettingChange);
  useEffect(() => {
    onPettingChangeRef.current = onPettingChange;
  }, [onPettingChange]);

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pathSinceStrokeRef.current = 0;
        lastGestureRef.current = { dx: 0, dy: 0 };
        setDragging(true);
        onPettingChangeRef.current?.(true);
        Animated.timing(glow, { toValue: 1, duration: 120, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_event, gesture) => {
        const delta =
          Math.abs(gesture.dx - lastGestureRef.current.dx) + Math.abs(gesture.dy - lastGestureRef.current.dy);
        lastGestureRef.current = { dx: gesture.dx, dy: gesture.dy };
        pathSinceStrokeRef.current += delta;
        if (pathSinceStrokeRef.current >= PET_STROKE_MIN_DISTANCE) {
          pathSinceStrokeRef.current = 0;
          registerStrokeRef.current();
        }
      },
      onPanResponderRelease: () => {
        pathSinceStrokeRef.current = 0;
        lastGestureRef.current = { dx: 0, dy: 0 };
        setDragging(false);
        onPettingChangeRef.current?.(false);
        Animated.timing(glow, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        pathSinceStrokeRef.current = 0;
        lastGestureRef.current = { dx: 0, dy: 0 };
        setDragging(false);
        onPettingChangeRef.current?.(false);
        Animated.timing(glow, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      },
    }),
  );

  const floatStyle = {
    opacity: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [
      {
        translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -52] }),
      },
    ],
  };

  const rippleStyle = {
    opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [
      {
        scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.7] }),
      },
    ],
  };

  const rotate = wiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel="가치고치 쓰다듬기"
        accessibilityHint="화면을 쓰다듬듯 세 번 문지르면 경험치를 얻어요"
        style={{
          width: scale(168),
          height: scale(168),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: scale(120),
              height: scale(120),
              borderRadius: scale(60),
              borderWidth: scale(3),
              borderColor: pixel.tangerine,
            },
            rippleStyle,
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: scale(108),
            height: scale(108),
            borderWidth: scale(3),
            borderColor: pixel.ink,
            backgroundColor: pixel.sand,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.7] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }) }],
          }}
        />

        <Animated.View style={{ transform: [{ scale: bounce }, { rotate }] }}>
          <PixelSprite id={growthSpriteId(growthStage.level)} size={scale(72)} />
        </Animated.View>

        {hearts.map((heart) => (
          <Animated.View
            key={heart.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              opacity: heart.anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
              transform: [
                {
                  translateY: heart.anim.interpolate({ inputRange: [0, 1], outputRange: [scale(10), -scale(70)] }),
                },
                {
                  translateX: heart.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, heart.driftX],
                  }),
                },
                {
                  scale: heart.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.15, 0.9] }),
                },
              ],
            }}>
            <MaterialIcons name="favorite" size={scale(22)} color={pixel.tangerine} />
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View
        style={{
          marginTop: scale(2),
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale(8),
          transform: [{ scale: progressPulse }],
        }}>
        {Array.from({ length: PET_STROKES_REQUIRED }).map((_, index) => {
          const filled = index < strokes;
          return (
            <View
              key={`stroke-dot-${index}`}
              style={{
                width: scale(18),
                height: scale(18),
                borderRadius: scale(9),
                backgroundColor: filled ? pixel.tangerine : pixel.white,
                borderWidth: scale(2),
                borderColor: pixel.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {filled ? <MaterialIcons name="favorite" size={scale(10)} color={pixel.white} /> : null}
            </View>
          );
        })}
      </Animated.View>

      <View
        style={{
          marginTop: scale(8),
          backgroundColor: dragging ? pixel.sand : pixel.white,
          borderWidth: scale(2),
          borderColor: pixel.ink,
          paddingHorizontal: scale(12),
          paddingVertical: scale(5),
        }}>
        <Text style={{ fontSize: scale(12), fontWeight: '800', color: pixel.ink }}>
          {dragging
            ? strokes === 0
              ? '쓰담쓰담 중…'
              : `쓰담 ${strokes}/${PET_STROKES_REQUIRED}!`
            : strokes === 0
              ? '손가락으로 쓰담쓰담 해주세요'
              : `쓰담 ${strokes}/${PET_STROKES_REQUIRED}`}
        </Text>
      </View>

      {floatXp != null ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: scale(8) }, floatStyle]}>
          <Text style={{ fontSize: scale(20), fontWeight: '800', color: pixel.tangerine }}>+{floatXp} XP</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
