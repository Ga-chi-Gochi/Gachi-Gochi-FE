import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { FigScreen } from '@/components/fig-screen';
import { TopBar } from '@/components/top-bar';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export default function WalkScreen() {
  const { scale } = useResponsive();

  return (
    <FigScreen colors={[palette.cream, palette.cream]}>
      <TopBar title="걷기" />
      <View style={{ flex: 1, paddingHorizontal: scale(24), gap: scale(16) }}>
        <Text style={{ fontSize: scale(30), fontWeight: '800', color: palette.ink }}>어떻게 걸어볼까요?</Text>
        <Text style={{ fontSize: scale(14), color: palette.muted, lineHeight: scale(20) }}>
          걸음이 가치고치를 키우는 반짝이는 가치 방울이 돼요
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/steps')}
          style={{ backgroundColor: palette.seaSoft, borderRadius: scale(24), padding: scale(18), minHeight: scale(180), overflow: 'hidden' }}>
          <View style={{ width: scale(52), height: scale(52), borderRadius: scale(16), backgroundColor: palette.sea, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="directions-walk" size={scale(26)} color={palette.white} />
          </View>
          <Text style={{ marginTop: scale(12), fontSize: scale(22), fontWeight: '800', color: palette.ink }}>나의 기록 연동하기</Text>
          <Text style={{ marginTop: scale(6), fontSize: scale(14), color: palette.body }}>건강 앱의 오늘 걸음 수를 가져와요</Text>
          <View style={{ alignSelf: 'flex-start', marginTop: scale(12), backgroundColor: palette.white, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
            <Text style={{ color: palette.sea, fontWeight: '800', fontSize: scale(12) }}>자동 · 하루 1번</Text>
          </View>
        </Pressable>
        <View style={{ backgroundColor: palette.leafSoft, borderRadius: scale(24), padding: scale(18), minHeight: scale(190), opacity: 0.72 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: scale(8) }}>
              <View style={{ width: scale(52), height: scale(52), borderRadius: scale(16), backgroundColor: palette.leaf, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="route" size={scale(26)} color={palette.white} />
              </View>
              <Text style={{ marginTop: scale(12), fontSize: scale(22), fontWeight: '800', color: palette.ink }}>고치와 함께 걷기</Text>
              <Text style={{ marginTop: scale(6), fontSize: scale(14), color: palette.body, lineHeight: scale(20) }}>
                띠롱이와 지도 위를{'\n'}같이 산책해요
              </Text>
            </View>
            <Image source={art.walk} style={{ width: scale(110), height: scale(120) }} contentFit="contain" />
          </View>
          <View style={{ flexDirection: 'row', gap: scale(8), marginTop: scale(12) }}>
            <View style={{ backgroundColor: palette.white, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
              <Text style={{ color: palette.leafDeep, fontWeight: '800', fontSize: scale(12) }}>포인트 더 많이</Text>
            </View>
            <View style={{ backgroundColor: palette.mist, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
              <Text style={{ color: palette.body, fontWeight: '700', fontSize: scale(12) }}>알이 깨어나면 열려요</Text>
            </View>
          </View>
        </View>
      </View>
    </FigScreen>
  );
}
