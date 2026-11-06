import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelChip, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import { getGochiEgg, GOCHI_EGG_RARITY_LABEL } from '@/constants/gochi-eggs';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type ExploreEggRewardProps = {
  eggId: string;
  eggCount: number;
  isNewType: boolean;
  onDone: () => void;
};

/** 다마고치풍 고치 알 등장 — 픽셀 알 흔들림 → 팝 */
export function ExploreEggReward({ eggId, eggCount, isNewType, onDone }: ExploreEggRewardProps) {
  const { scale } = useResponsive();
  const egg = getGochiEgg(eggId);
  const wobble = useSharedValue(0);
  const pop = useSharedValue(0.72);

  useEffect(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    wobble.value = withSequence(
      withTiming(-10, { duration: 90, easing: Easing.inOut(Easing.quad) }),
      withTiming(10, { duration: 90, easing: Easing.inOut(Easing.quad) }),
      withTiming(-8, { duration: 80, easing: Easing.inOut(Easing.quad) }),
      withTiming(8, { duration: 80, easing: Easing.inOut(Easing.quad) }),
      withTiming(-5, { duration: 70, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 70, easing: Easing.inOut(Easing.quad) }),
    );
    pop.value = withSequence(
      withTiming(0.72, { duration: 0 }),
      withTiming(1.16, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
    );
    const haptic = setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 480);
    return () => clearTimeout(haptic);
  }, [pop, wobble]);

  const eggStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value}deg` }, { scale: pop.value }],
  }));

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(26,21,32,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(24),
        zIndex: 50,
      }}>
      <PixelPanel style={{ width: '100%', maxWidth: scale(320), alignItems: 'center', gap: scale(10) }}>
        <PixelText size={11} color={pixel.muted} center>
          탐험 보상
        </PixelText>
        {isNewType ? <PixelChip label="NEW" bg={pixel.tangerine} /> : null}

        <View
          style={{
            width: scale(140),
            height: scale(140),
            borderWidth: scale(pixel.border),
            borderColor: pixel.ink,
            backgroundColor: pixel.grass,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Animated.View style={eggStyle}>
            <PixelSprite id={egg?.sprite ?? 'egg'} size={scale(96)} />
          </Animated.View>
        </View>

        <PixelText size={20} center>
          {egg?.name ?? '고치 알'}을 얻었어요!
        </PixelText>
        <PixelText size={13} color={pixel.muted} center>
          {egg?.detail ?? '숲에서 데려온 알이에요.'}
        </PixelText>
        {egg ? (
          <PixelChip label={GOCHI_EGG_RARITY_LABEL[egg.rarity]} bg={pixel.sand} />
        ) : null}
        <PixelText size={12} color={pixel.leaf}>
          보유 알 {eggCount}개
        </PixelText>
        <View style={{ alignSelf: 'stretch', marginTop: scale(4) }}>
          <PixelButton label="받기 완료" tone="green" onPress={onDone} />
        </View>
      </PixelPanel>
    </View>
  );
}
