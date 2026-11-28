import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { GrowthMotion, growthMotionKind } from '@/components/island/growth-motion';
import { growthSpriteId, PixelSprite } from '@/components/pixel/pixel-sprite';
import { gachiUi, galmuri } from '@/constants/gachi-ui';
import { getGrowthRevealCopy, type GrowthStage } from '@/constants/growth';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

const PANEL = { width: 320, side: 24, pad: 16, gap: 10, sprite: 96, button: 44 };
const COLOR = { ready: '#ffd27a', wait: '#e6dccb' };
const COPY: Record<number, { title: string; body: string }> = {
  2: { title: '알이 깨어났수다!', body: '봉그깅하고 걸은 마음이 모여 귤새가 태어났어요.' },
  3: { title: '쑥쑥 자랐수다!', body: '제주를 돌볼수록 귤새가 더 튼튼해져요.' },
  4: { title: '가치고치가 되었수다!', body: '함께 지킨 제주만큼 다 자랐어요.\n이제 우리 섬을 마음껏 꾸며 봐요.' },
};

type GrowthRevealProps = {
  from: GrowthStage;
  to: GrowthStage;
  onDone: () => void;
};

export function GrowthReveal({ from, to, onDone }: GrowthRevealProps) {
  const { scale, width } = useResponsive();
  const copy = COPY[to.level] ?? getGrowthRevealCopy(from, to);
  const motion = growthMotionKind(from.level, to.level);
  const [played, setPlayed] = useState(!motion);
  const border = scale(pixel.border);
  const panelWidth = Math.min(scale(PANEL.width), width - scale(PANEL.side) * 2);

  useEffect(() => {
    if (motion) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [motion]);

  const line = (height: number) => ({ fontFamily: galmuri.bold, lineHeight: scale(height), alignSelf: 'stretch' as const });

  return (
    <View
      pointerEvents="auto"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: pixel.dim,
        alignItems: 'center',
        justifyContent: 'center',
        // 키우기 버튼(z45)·화산재 가드(z80)보다 위에 올려 연타를 막는다
        zIndex: 90,
      }}>
      <View
        style={{
          width: panelWidth,
          backgroundColor: pixel.panel,
          borderWidth: border,
          borderColor: pixel.ink,
          padding: scale(PANEL.pad) - border,
          alignItems: 'center',
          gap: scale(PANEL.gap),
        }}>
        <View style={{ width: scale(PANEL.sprite), height: scale(PANEL.sprite), alignItems: 'center', justifyContent: 'center' }}>
          {motion ? (
            <GrowthMotion
              kind={motion}
              size={scale(PANEL.sprite)}
              onReveal={() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
              onDone={() => setPlayed(true)}
            />
          ) : (
            <PixelSprite id={growthSpriteId(to.level)} size={scale(PANEL.sprite)} />
          )}
        </View>
        <GalmuriText size={16} bold center style={line(20)}>
          {played ? copy.title : '…!'}
        </GalmuriText>
        <GalmuriText size={12} bold center style={[line(16), { opacity: played ? 1 : 0 }]}>
          {copy.body}
        </GalmuriText>
        <GalmuriText size={11} bold color={gachiUi.greenDeep} center style={line(14)}>
          Lv.{from.level} {from.label} → Lv.{to.level} {to.label}
        </GalmuriText>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !played }}
          disabled={!played}
          onPress={onDone}
          style={{
            alignSelf: 'stretch',
            height: scale(PANEL.button),
            backgroundColor: played ? COLOR.ready : COLOR.wait,
            borderWidth: border,
            borderColor: pixel.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <GalmuriText size={13} bold center style={line(16)}>
            계속하기
          </GalmuriText>
        </Pressable>
      </View>
    </View>
  );
}
