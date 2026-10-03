import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { FigScreen } from '@/components/fig-screen';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export default function CompleteScreen() {
  const { scale } = useResponsive();

  return (
    <FigScreen colors={['#FFF5D1', '#FFF9F1']}>
      <View style={{ flex: 1, paddingHorizontal: scale(20), paddingBottom: scale(16) }}>
        <View style={{ alignSelf: 'center', marginTop: scale(24), backgroundColor: palette.leafSoft, borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(5) }}>
          <Text style={{ color: palette.leafDeep, fontWeight: '800' }}>10분 함께 놀기 완료!</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={art.camellia} style={{ position: 'absolute', left: scale(8), bottom: scale(40), width: scale(84), height: scale(64) }} contentFit="contain" />
          <Image source={art.pebble} style={{ position: 'absolute', right: scale(8), bottom: scale(30), width: scale(76), height: scale(60) }} contentFit="contain" />
          <Image source={art.canola} style={{ position: 'absolute', right: scale(16), top: scale(20), width: scale(58), height: scale(54) }} contentFit="contain" />
          <View style={{ position: 'absolute', right: scale(20), top: scale(8), backgroundColor: palette.white, borderRadius: scale(16), paddingHorizontal: scale(10), paddingVertical: scale(6) }}>
            <Text style={{ fontWeight: '700' }}>기분이 좋아졌다!</Text>
          </View>
          <View style={{ position: 'absolute', left: scale(8), top: scale(70), backgroundColor: palette.white, borderRadius: scale(16), paddingHorizontal: scale(10), paddingVertical: scale(6) }}>
            <Text style={{ fontWeight: '700' }}>행복해!</Text>
          </View>
          <Image source={art.jump} style={{ width: scale(190), height: scale(190) }} contentFit="contain" />
        </View>
        <View style={{ backgroundColor: palette.white, borderRadius: scale(20), padding: scale(16), gap: scale(8), marginBottom: scale(16) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: scale(24), fontWeight: '800', color: palette.tangerineDeep }}>+50p</Text>
            <Text style={{ fontSize: scale(24), fontWeight: '800', color: palette.ink }}>행복 방울 3개</Text>
          </View>
          <Text style={{ color: palette.muted, fontSize: scale(14) }}>가치고치를 성장하게 하는 행복 방울이 생겼어요</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <FigButton label="섬에 행복 방울 심기" onPress={() => router.replace('/home')} />
        </View>
      </View>
    </FigScreen>
  );
}
