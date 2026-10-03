import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FigButton } from '@/components/fig-button';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export default function RecognizeScreen() {
  const { scale } = useResponsive();

  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
      <Image source={art.trash} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} contentFit="cover" />
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(26,23,31,0.35)' }} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), marginTop: scale(8) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={() => router.back()}
            style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="close" size={scale(22)} color={palette.ink} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(8) }}>
              <MaterialIcons name="delete-outline" size={scale(16)} color={palette.white} />
              <Text style={{ color: palette.white, fontWeight: '800' }}>쓰레기 인식!</Text>
            </View>
          </View>
          <View style={{ width: scale(42) }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(10) }}>
          <View style={{ backgroundColor: palette.canola, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(6), flexDirection: 'row', gap: scale(4), alignItems: 'center' }}>
            <MaterialIcons name="check" size={scale(16)} color={palette.ink} />
            <Text style={{ fontWeight: '800', color: palette.ink, fontSize: scale(12) }}>플라스틱 병 · 92%</Text>
          </View>
          <View style={{ width: scale(180), height: scale(200), borderWidth: 2, borderColor: palette.canola, borderRadius: scale(16) }} />
          <View style={{ backgroundColor: palette.white, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(6) }}>
            <Text style={{ fontWeight: '800', color: palette.ink, fontSize: scale(12) }}>과자 봉지 · 88%</Text>
          </View>
        </View>
        <View style={{ backgroundColor: palette.white, borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28), padding: scale(20), gap: scale(12) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: scale(22), fontWeight: '800', color: palette.ink }}>쓰레기 2개를 찾았어요</Text>
            <View style={{ backgroundColor: palette.canolaSoft, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
              <Text style={{ color: palette.ink, fontWeight: '800', fontSize: scale(12) }}>인식 완료</Text>
            </View>
          </View>
          <Text style={{ color: palette.muted, fontSize: scale(14), lineHeight: scale(20) }}>
            주운 뒤 버튼을 누르면 인증돼요. 사진은 검증에만 쓰여요.
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <FigButton label="주웠어요! 인증하기" onPress={() => router.replace('/picked')} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
