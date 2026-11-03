import { Alert, Pressable, View } from 'react-native';

import { HomeTopBar, HomeTopIcons, useHomeTopLayout } from '@/components/home-top-bar';
import { PixelChip, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function ResourceHeader() {
  const { scale } = useResponsive();
  const { iconsInset, iconsHeight } = useHomeTopLayout();
  const { xp, growthStacks, oxygen, water, growthStage, unlockedZones, resetLocalData } = usePlayState();

  const onReset = () => {
    Alert.alert('데이터 초기화', '이 기기에 저장된 섬·경험치·걷기 기록을 모두 지울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await resetLocalData();
            Alert.alert('완료', '로컬 데이터를 초기화했어요.');
          })();
        },
      },
    ]);
  };

  return (
    <View
      style={{
        paddingLeft: scale(16),
        paddingRight: scale(16) + iconsInset,
        paddingTop: scale(8),
        gap: scale(8),
        minHeight: scale(8) + iconsHeight,
      }}>
      <HomeTopBar
        coinRowExtra={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
            <PixelChip label={`구역 ${unlockedZones.length}`} bg={pixel.sand} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="로컬 데이터 초기화"
              onPress={onReset}
              style={{
                paddingHorizontal: scale(8),
                paddingVertical: scale(6),
                borderWidth: scale(2),
                borderColor: pixel.ink,
                backgroundColor: pixel.white,
              }}>
              <PixelText size={11}>초기화</PixelText>
            </Pressable>
          </View>
        }
      />

      <View>
        <PixelText size={12} color={pixel.muted}>
          좋은 아침이에요
        </PixelText>
        <PixelText size={24}>띠롱이의 섬</PixelText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(6) }}>
        <PixelChip label={`Lv.${growthStage.level} ${growthStage.label}`} bg={pixel.grass} />
        <PixelChip label={`산소 ${oxygen}`} bg={pixel.sky} />
        <PixelChip label={`물방울 ${water}`} bg={pixel.sea} color={pixel.white} />
        <PixelChip label={`XP ${xp}`} bg={pixel.sand} />
        <PixelChip label={`섬+ ${growthStacks}`} bg={pixel.white} />
      </View>

      <HomeTopIcons top={scale(8)} side={scale(16)} />
    </View>
  );
}
