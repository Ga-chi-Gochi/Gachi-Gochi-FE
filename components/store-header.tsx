import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelChip, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { pixel } from '@/constants/pixel-theme';
import { ISLAND_HOME } from '@/constants/routes';
import { useResponsive } from '@/hooks/use-responsive';

export function StoreHeader() {
  const { scale } = useResponsive();
  const { coins, xp } = usePlayState();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.navigate(ISLAND_HOME);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingTop: scale(8),
        paddingBottom: scale(10),
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          hitSlop={scale(8)}
          onPress={goBack}
          style={{ borderWidth: scale(2), borderColor: pixel.ink, backgroundColor: pixel.white, padding: scale(4) }}>
          <MaterialIcons name="arrow-back" size={scale(20)} color={pixel.ink} />
        </Pressable>
        <PixelText size={22}>상점</PixelText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
        <PixelChip label={`XP ${xp}`} bg={pixel.sand} />
        <PixelSprite id="tangerine" size={scale(22)} />
        <View
          style={{
            backgroundColor: pixel.white,
            borderWidth: scale(2),
            borderColor: pixel.ink,
            paddingHorizontal: scale(10),
            paddingVertical: scale(4),
          }}>
          <PixelText size={13}>귤 {coins}</PixelText>
        </View>
      </View>
    </View>
  );
}
