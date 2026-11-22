import { Image } from 'expo-image';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { gachiUi } from '@/constants/gachi-ui';
import { uiHud } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type GachiCoinBadgeProps = {
  value: number;
  style?: StyleProp<ViewStyle>;
};

/** 귤 아이콘 + 갈무리 숫자 (hud-coin 의 고정 숫자 대신 동적) */
export function GachiCoinBadge({ value, style }: GachiCoinBadgeProps) {
  const { scale } = useResponsive();
  const height = scale(17);
  const icon = scale(16);
  const border = scale(gachiUi.border);

  return (
    <View
      accessible
      accessibilityLabel={`귤 ${value}개`}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          height,
          paddingRight: scale(8),
          paddingLeft: scale(2),
          backgroundColor: gachiUi.beige,
          borderWidth: border,
          borderColor: gachiUi.ink,
          borderRadius: scale(10),
          gap: scale(4),
        },
        style,
      ]}>
      <Image
        source={uiHud.tangerine}
        style={{ width: icon, height: icon, ...pixelImageStyle }}
        contentFit="contain"
      />
      <GalmuriText size={9} bold>
        {value}
      </GalmuriText>
    </View>
  );
}

type GachiXpBarProps = {
  ratio: number;
  width?: number;
  style?: StyleProp<ViewStyle>;
};

/** XP 바. full 에셋을 비율만큼 마스크 */
export function GachiXpBar({ ratio, width = 128, style }: GachiXpBarProps) {
  const { scale } = useResponsive();
  const barWidth = scale(width);
  const barHeight = scale(16);
  const clamped = Math.min(1, Math.max(0, ratio));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="경험치"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ width: barWidth, height: barHeight }, style]}>
      <Image
        source={uiHud.xpEmpty}
        style={{ position: 'absolute', width: barWidth, height: barHeight, ...pixelImageStyle }}
        contentFit="fill"
      />
      <View style={{ width: barWidth * clamped, height: barHeight, overflow: 'hidden' }}>
        <Image
          source={uiHud.xpFull}
          style={{ width: barWidth, height: barHeight, ...pixelImageStyle }}
          contentFit="fill"
        />
      </View>
    </View>
  );
}

type GachiLogoProps = {
  style?: StyleProp<ViewStyle>;
};

export function GachiLogo({ style }: GachiLogoProps) {
  const { scale } = useResponsive();
  return (
    <View style={style}>
      <Image
        source={uiHud.logo}
        style={{ width: scale(66), height: scale(22), ...pixelImageStyle }}
        contentFit="contain"
        accessibilityLabel="가치고치"
      />
    </View>
  );
}

type GachiHudProps = {
  coins: number;
  xpRatio: number;
  style?: StyleProp<ViewStyle>;
};

/** 홈 좌측 상단 HUD 묶음 */
export function GachiHud({ coins, xpRatio, style }: GachiHudProps) {
  const { scale } = useResponsive();
  return (
    <View style={[{ gap: scale(6), alignItems: 'flex-start' }, style]}>
      <GachiXpBar ratio={xpRatio} />
      <GachiCoinBadge value={coins} />
    </View>
  );
}
