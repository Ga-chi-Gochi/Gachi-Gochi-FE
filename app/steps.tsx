import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { FigScreen } from '@/components/fig-screen';
import { TopBar } from '@/components/top-bar';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export default function StepsScreen() {
  const { scale } = useResponsive();

  return (
    <FigScreen colors={[palette.cream, palette.cream]}>
      <TopBar title="나의 기록 연동" />
      <View style={{ flex: 1, paddingHorizontal: scale(24), gap: scale(14) }}>
        <View style={{ backgroundColor: palette.white, borderRadius: scale(24), padding: scale(18), gap: scale(12) }}>
          <Text style={{ color: palette.muted, fontSize: scale(14) }}>오늘은</Text>
          <Text style={{ fontSize: scale(36), fontWeight: '800', color: palette.sea }}>
            6,240 <Text style={{ fontSize: scale(18), color: palette.ink }}>보 걸었어요</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: scale(8) }}>
            <View style={{ flex: 1, backgroundColor: palette.mist, borderRadius: scale(16), padding: scale(12) }}>
              <Text style={{ fontSize: scale(18), fontWeight: '800', color: palette.ink }}>312 kcal</Text>
              <Text style={{ color: palette.muted, fontSize: scale(12), marginTop: scale(4) }}>소모했고</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: palette.mist, borderRadius: scale(16), padding: scale(12) }}>
              <Text style={{ fontSize: scale(18), fontWeight: '800', color: palette.ink }}>0.4 kg</Text>
              <Text style={{ color: palette.muted, fontSize: scale(12), marginTop: scale(4) }}>탄소를 줄였어요</Text>
            </View>
          </View>
          <Text style={{ alignSelf: 'flex-end', color: palette.muted, fontSize: scale(12) }}>* 수치는 예시</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: palette.white, borderRadius: scale(24), padding: scale(16), alignItems: 'center' }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: palette.ink, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
            <Text style={{ color: palette.white, fontSize: scale(12), fontWeight: '700' }}>반짝이는 가치 방울</Text>
          </View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: scale(4) }}>
            <Image source={art.smile} style={{ width: scale(92), height: scale(100) }} contentFit="contain" />
            <Image source={art.dropJump} style={{ width: scale(74), height: scale(106) }} contentFit="contain" />
            <Image source={art.wink} style={{ width: scale(82), height: scale(93) }} contentFit="contain" />
          </View>
          <Text style={{ color: palette.body, fontSize: scale(12) }}>모인 방울이 띠롱이를 자라게 해요</Text>
        </View>
        <Text style={{ textAlign: 'center', fontSize: scale(36), fontWeight: '800', color: palette.tangerineDeep }}>+300p</Text>
        <View style={{ flexDirection: 'row', marginBottom: scale(8) }}>
          <FigButton label="섬에 반영하기" onPress={() => router.replace('/home')} />
        </View>
      </View>
    </FigScreen>
  );
}
