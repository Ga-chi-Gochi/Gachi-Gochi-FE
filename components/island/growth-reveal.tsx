import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { growthSpriteId, PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import { getGrowthRevealCopy, type GrowthStage } from '@/constants/growth';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type GrowthRevealProps = {
  from: GrowthStage;
  to: GrowthStage;
  onDone: () => void;
};

export function GrowthReveal({ from, to, onDone }: GrowthRevealProps) {
  const { scale } = useResponsive();
  const [pop] = useState(() => new Animated.Value(0.7));
  const copy = getGrowthRevealCopy(from, to);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.timing(pop, { toValue: 1.12, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(pop, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [pop]);

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
        zIndex: 40,
      }}>
      <PixelPanel style={{ width: '100%', maxWidth: scale(320), alignItems: 'center', gap: scale(10) }}>
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <PixelSprite id={growthSpriteId(to.level)} size={scale(96)} />
        </Animated.View>
        <PixelText size={20} center>
          {copy.title}
        </PixelText>
        <PixelText size={13} color={pixel.muted} center>
          {copy.body}
        </PixelText>
        <PixelText size={12} color={pixel.leaf}>
          Lv.{from.level} {from.label} → Lv.{to.level} {to.label}
        </PixelText>
        <View style={{ alignSelf: 'stretch', marginTop: scale(4) }}>
          <PixelButton label="계속하기" onPress={onDone} />
        </View>
      </PixelPanel>
    </View>
  );
}
