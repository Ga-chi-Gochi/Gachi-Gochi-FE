import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

const STAGE_MS = 1100;

const stages = ['사진을 확인하고 있어요', '쓰레기를 분석하고 있어요', '결과를 정리하고 있어요'];

type AnalysisSkeletonProps = {
  error?: string | null;
  onCancel: () => void;
  onDone: () => void;
  onRetry?: () => void;
};

export function AnalysisSkeleton({ error, onCancel, onDone, onRetry }: AnalysisSkeletonProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let alive = true;
    const timers = stages.map((_, index) =>
      setTimeout(() => {
        if (alive) {
          setStep(index);
        }
      }, index * STAGE_MS),
    );
    const done = setTimeout(() => {
      if (alive) {
        onDoneRef.current();
      }
    }, stages.length * STAGE_MS);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, []);

  const message = error ?? stages[step];

  return (
    <View style={{ flex: 1, backgroundColor: palette.mist, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), marginTop: scale(8) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="분석 취소"
          onPress={onCancel}
          style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="close" size={scale(22)} color={palette.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ backgroundColor: palette.white, borderRadius: scale(999), borderWidth: 1, borderColor: palette.line, paddingHorizontal: scale(12), paddingVertical: scale(8) }}>
            <Text style={{ color: palette.ink, fontWeight: '800' }}>분석 중</Text>
          </View>
        </View>
        <View style={{ width: scale(42) }} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(10), paddingHorizontal: scale(24) }}>
        <Bone width={scale(148)} height={scale(28)} radius={scale(999)} />
        <Bone width={scale(132)} height={scale(28)} radius={scale(999)} />
        <Bone width={scale(168)} height={scale(176)} radius={scale(16)} />
      </View>
      <View
        style={{
          backgroundColor: palette.white,
          borderTopLeftRadius: scale(28),
          borderTopRightRadius: scale(28),
          paddingTop: scale(18),
          paddingHorizontal: scale(20),
          paddingBottom: Math.max(insets.bottom, scale(12)) + scale(8),
          gap: scale(14),
        }}>
        <Text accessibilityLiveRegion="polite" style={{ color: palette.ink, fontSize: scale(22), fontWeight: '800', lineHeight: scale(28) }}>
          {message}
        </Text>
        <View style={{ flexDirection: 'row', gap: scale(6) }}>
          {stages.map((stage, index) => (
            <View key={stage} style={{ width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: index <= step ? palette.tangerine : palette.line }} />
          ))}
        </View>
        <Bone width="72%" height={scale(14)} radius={scale(7)} />
        <View style={{ flexDirection: 'row', gap: scale(8) }}>
          <View style={{ flex: 1 }}>
            <Bone width="100%" height={scale(72)} radius={scale(16)} />
          </View>
          <View style={{ flex: 1 }}>
            <Bone width="100%" height={scale(72)} radius={scale(16)} />
          </View>
        </View>
        {error && onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다시 시도"
            onPress={onRetry}
            style={{ minHeight: scale(52), borderRadius: scale(20), backgroundColor: palette.tangerine, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: palette.white, fontSize: scale(16), fontWeight: '800' }}>다시 시도</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="분석 취소" onPress={onCancel} style={{ minHeight: scale(52), borderRadius: scale(20), borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: palette.ink, fontSize: scale(16), fontWeight: '800' }}>취소</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Bone({ width, height, radius }: { width: number | `${number}%`; height: number; radius: number }) {
  const glow = useSharedValue(0.45);

  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [glow]);

  const shine = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: palette.line, overflow: 'hidden' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: palette.white }, shine]} />
    </View>
  );
}
