import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { TopBar } from '@/components/top-bar';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

const stats = [
  { value: '12:40', label: '시간' },
  { value: '0.8km', label: '거리' },
  { value: '1,120', label: '발자국' },
];

export default function StrollScreen() {
  const { scale } = useResponsive();

  return (
    <View style={{ flex: 1, backgroundColor: palette.cream }}>
      <Image source={art.map} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} contentFit="cover" />
      <View style={{ flex: 1 }}>
        <View style={{ paddingTop: scale(8) }}>
          <TopBar title="" light />
        </View>
        <View style={{ position: 'absolute', top: scale(108), right: scale(20), alignItems: 'flex-end', gap: scale(8) }}>
          <View style={{ backgroundColor: palette.ink, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
            <Text style={{ color: palette.white, fontSize: scale(12), fontWeight: '700' }}>AR 산책</Text>
          </View>
          <View style={{ width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: palette.tangerine, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="place" size={scale(20)} color={palette.white} />
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={art.walk} style={{ width: scale(92), height: scale(98) }} contentFit="contain" />
        </View>
        <View style={{ backgroundColor: palette.white, borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28), padding: scale(20), gap: scale(14) }}>
          <View style={{ alignSelf: 'center', width: scale(40), height: scale(5), borderRadius: scale(3), backgroundColor: palette.line }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: scale(22), fontWeight: '800', color: palette.ink }}>띠롱이와 산책 중</Text>
            <View style={{ backgroundColor: palette.leafSoft, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
              <Text style={{ color: palette.leafDeep, fontWeight: '800', fontSize: scale(12) }}>포인트 2배</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: scale(8) }}>
            {stats.map((stat) => (
              <View key={stat.label} style={{ flex: 1, backgroundColor: palette.mist, borderRadius: scale(16), paddingVertical: scale(10), alignItems: 'center' }}>
                <Text style={{ fontSize: scale(18), fontWeight: '800', color: palette.ink }}>{stat.value}</Text>
                <Text style={{ marginTop: scale(4), fontSize: scale(12), color: palette.muted }}>{stat.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            <FigButton label="같이 산책하기" tone="green" onPress={() => router.replace('/home')} />
          </View>
        </View>
      </View>
    </View>
  );
}
