import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

const FANFARE_MS = 2500;

const sparks = [
  { x: -108, y: -18, color: palette.canola, delay: 0, size: 14 },
  { x: 112, y: -24, color: palette.tangerine, delay: 40, size: 12 },
  { x: -46, y: -118, color: palette.leaf, delay: 20, size: 11 },
  { x: 58, y: -124, color: palette.sea, delay: 70, size: 10 },
  { x: -132, y: 36, color: palette.tangerineDeep, delay: 30, size: 9 },
  { x: 128, y: 28, color: palette.canola, delay: 90, size: 10 },
  { x: 6, y: -146, color: palette.tangerine, delay: 0, size: 13 },
  { x: -16, y: 108, color: palette.leaf, delay: 60, size: 9 },
  { x: -78, y: -78, color: palette.white, delay: 360, size: 8 },
  { x: 84, y: -86, color: palette.canola, delay: 400, size: 9 },
  { x: -96, y: 72, color: palette.tangerineSoft, delay: 420, size: 8 },
  { x: 92, y: 64, color: palette.white, delay: 380, size: 7 },
];

type RewardFanfareProps = {
  fromXp: number;
  toXp: number;
  fromGrowth: number;
  toGrowth: number;
  onDone: () => void;
};

export function RewardFanfare({ fromXp, toXp, fromGrowth, toGrowth, onDone }: RewardFanfareProps) {
  const { scale, width } = useResponsive();
  const insets = useSafeAreaInsets();
  const curtain = useSharedValue(1);
  const badge = useSharedValue(0.55);
  const ring = useSharedValue(0.35);
  const ringOpacity = useSharedValue(0.85);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    badge.value = withSequence(withTiming(1.16, { duration: 320, easing: Easing.out(Easing.cubic) }), withTiming(1, { duration: 180 }));
    ring.value = withTiming(1.85, { duration: 760, easing: Easing.out(Easing.quad) });
    ringOpacity.value = withTiming(0, { duration: 760 });
    curtain.value = withDelay(FANFARE_MS - 420, withTiming(0, { duration: 380 }));
    const timer = setTimeout(onDone, FANFARE_MS);
    return () => clearTimeout(timer);
  }, [badge, curtain, onDone, ring, ringOpacity]);

  const curtainStyle = useAnimatedStyle(() => ({ opacity: curtain.value }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badge.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ring.value }],
  }));

  return (
    <Animated.View
      accessibilityRole="summary"
      accessibilityLabel={`기여했어요. 경험치 ${toXp}, 섬 성장 ${toGrowth}`}
      style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: scale(24), backgroundColor: 'rgba(26,23,31,0.62)' }, curtainStyle]}>
      <View style={{ width: Math.min(scale(320), width - scale(48)), alignItems: 'center' }}>
        <View style={{ width: scale(88), height: scale(88), alignItems: 'center', justifyContent: 'center', marginBottom: scale(16) }}>
          {sparks.map((spark) => (
            <Spark key={`${spark.x}-${spark.y}`} {...spark} scale={scale} />
          ))}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: scale(88),
                height: scale(88),
                borderRadius: scale(44),
                borderWidth: scale(3),
                borderColor: palette.canola,
              },
              ringStyle,
            ]}
          />
          <Animated.View
            style={[
              {
                width: scale(72),
                height: scale(72),
                borderRadius: scale(36),
                backgroundColor: palette.canola,
                alignItems: 'center',
                justifyContent: 'center',
              },
              badgeStyle,
            ]}>
            <Text style={{ color: palette.ink, fontSize: scale(32), fontWeight: '800', lineHeight: scale(36) }}>✦</Text>
          </Animated.View>
        </View>
        <Text style={{ color: palette.white, fontSize: scale(28), fontWeight: '800' }}>기여했어요!</Text>
        <Text style={{ color: 'rgba(255,255,255,0.86)', fontSize: scale(15), fontWeight: '700', marginTop: scale(6) }}>경험치와 섬이 자랐어요</Text>
        <View style={{ flexDirection: 'row', gap: scale(10), marginTop: scale(22), alignSelf: 'stretch' }}>
          <GainCard label="경험치" from={fromXp} to={toXp} gain={toXp - fromXp} backgroundColor={palette.canolaSoft} />
          <GainCard label="섬 성장" from={fromGrowth} to={toGrowth} gain={toGrowth - fromGrowth} backgroundColor={palette.leafSoft} />
        </View>
      </View>
    </Animated.View>
  );
}

function Spark({ x, y, color, delay, size, scale }: { x: number; y: number; color: string; delay: number; size: number; scale: (value: number) => number }) {
  const progress = useSharedValue(0);
  const travelX = scale(x);
  const travelY = scale(y);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.12 ? progress.value / 0.12 : progress.value < 0.62 ? 1 : 1 - (progress.value - 0.62) / 0.38,
    transform: [{ translateX: travelX * progress.value }, { translateY: travelY * progress.value }, { scale: 0.4 + progress.value * 0.8 }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: scale(size),
          height: scale(size),
          borderRadius: scale(size / 2),
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function GainCard({ label, from, to, gain, backgroundColor }: { label: string; from: number; to: number; gain: number; backgroundColor: string }) {
  const { scale } = useResponsive();
  const shown = useCountUp(from, to, 260, 980);
  const pop = useSharedValue(0.86);
  const floatY = useSharedValue(scale(8));
  const floatOpacity = useSharedValue(0);

  useEffect(() => {
    pop.value = withDelay(260, withSequence(withTiming(1.12, { duration: 240 }), withTiming(1, { duration: 180 })));
    floatOpacity.value = withDelay(420, withSequence(withTiming(1, { duration: 140 }), withDelay(520, withTiming(0, { duration: 360 }))));
    floatY.value = withDelay(420, withTiming(-scale(22), { duration: 900, easing: Easing.out(Easing.quad) }));
  }, [floatOpacity, floatY, pop, scale]);

  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const floatStyle = useAnimatedStyle(() => ({
    opacity: floatOpacity.value,
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor, borderRadius: scale(18), paddingVertical: scale(14), paddingHorizontal: scale(12), alignItems: 'center', overflow: 'visible' }}>
      <Text style={{ color: palette.muted, fontSize: scale(12), fontWeight: '700' }}>{label}</Text>
      <Animated.View style={numberStyle}>
        <Text style={{ color: palette.ink, fontSize: scale(32), fontWeight: '800', marginTop: scale(4) }}>{shown}</Text>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: scale(28), right: scale(10) }, floatStyle]}>
        <Text style={{ color: palette.tangerineDeep, fontSize: scale(16), fontWeight: '800' }}>+{gain}</Text>
      </Animated.View>
    </View>
  );
}

function useCountUp(from: number, to: number, delay: number, duration: number) {
  const [shown, setShown] = useState(from);

  useEffect(() => {
    const started = Date.now();
    let frame = 0;
    const tick = () => {
      const elapsed = Date.now() - started - delay;
      if (elapsed < 0) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (to - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [delay, duration, from, to]);

  return shown;
}
