import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { TopBar } from '@/components/top-bar';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export default function StoreScreen() {
  const { scale } = useResponsive();

  return (
    <View style={{ flex: 1, backgroundColor: palette.cream }}>
      <Image source={art.map} style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '70%' }} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <TopBar title="로컬 상점" />
        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingRight: scale(48) }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: scale(48), height: scale(48), borderRadius: scale(24), backgroundColor: palette.tangerine, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="storefront" size={scale(24)} color={palette.white} />
            </View>
            <View style={{ marginTop: scale(4), backgroundColor: palette.white, borderRadius: scale(10), paddingHorizontal: scale(8), paddingVertical: scale(3) }}>
              <Text style={{ fontSize: scale(12), fontWeight: '800', color: palette.ink }}>도토리숲</Text>
            </View>
          </View>
        </View>
        <View style={{ backgroundColor: palette.white, borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28), padding: scale(20), gap: scale(14) }}>
          <View style={{ alignSelf: 'center', width: scale(40), height: scale(5), borderRadius: scale(3), backgroundColor: palette.line }} />
          <View style={{ flexDirection: 'row', gap: scale(12), alignItems: 'center' }}>
            <Image source={art.store} style={{ width: scale(110), height: scale(90), borderRadius: scale(16) }} contentFit="cover" />
            <View style={{ flex: 1, gap: scale(6) }}>
              <Text style={{ fontSize: scale(24), fontWeight: '800', color: palette.ink }}>도토리숲</Text>
              <Text style={{ color: palette.muted, fontSize: scale(14) }}>카페 · 120m · 영업 중</Text>
              <View style={{ flexDirection: 'row', gap: scale(6) }}>
                <View style={{ backgroundColor: palette.blush, borderRadius: scale(999), paddingHorizontal: scale(8), paddingVertical: scale(3) }}>
                  <Text style={{ fontSize: scale(11), fontWeight: '800', color: palette.tangerineDeep }}>탐나는전 가맹점</Text>
                </View>
                <View style={{ backgroundColor: palette.leafSoft, borderRadius: scale(999), paddingHorizontal: scale(8), paddingVertical: scale(3) }}>
                  <Text style={{ fontSize: scale(11), fontWeight: '800', color: palette.leafDeep }}>단골 Lv.2</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={{ fontSize: scale(22), fontWeight: '800', color: palette.ink }}>여기가 맞나요?</Text>
          <View style={{ flexDirection: 'row', gap: scale(10) }}>
            <FigButton label="다른 곳이에요" tone="white" onPress={() => router.back()} />
            <FigButton label="맞아요" onPress={() => router.push('/stay')} />
          </View>
        </View>
      </View>
    </View>
  );
}
