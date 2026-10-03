import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { FigScreen } from '@/components/fig-screen';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export default function PickedScreen() {
  const { scale } = useResponsive();

  return (
    <FigScreen colors={['#FFF5D1', '#FFF9F1']}>
      <View style={{ flex: 1, paddingHorizontal: scale(20), paddingBottom: scale(16) }}>
        <Text style={{ marginTop: scale(36), fontSize: scale(40), fontWeight: '800', color: palette.tangerineDeep }}>쓰레기 +1!</Text>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: scale(220), backgroundColor: palette.white, borderRadius: scale(24), padding: scale(12), alignItems: 'center' }}>
            <Image source={art.trash} style={{ width: scale(196), height: scale(196), borderRadius: scale(16) }} contentFit="cover" />
            <Text style={{ marginTop: scale(8), color: palette.muted, fontSize: scale(12) }}>10월 1일 · 협재 해변</Text>
          </View>
          <View style={{ position: 'absolute', top: scale(28), left: scale(28), width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: palette.leaf, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="check" size={scale(22)} color={palette.white} />
          </View>
          <Image source={art.jump} style={{ position: 'absolute', right: 0, bottom: scale(10), width: scale(140), height: scale(140) }} contentFit="contain" />
          <View style={{ position: 'absolute', left: 0, bottom: scale(24), backgroundColor: palette.white, borderRadius: scale(16), paddingHorizontal: scale(12), paddingVertical: scale(8) }}>
            <Text style={{ fontWeight: '700', color: palette.ink }}>이번엔.. 먹다 남은 과자야.</Text>
          </View>
        </View>
        <Text style={{ textAlign: 'center', fontSize: scale(36), fontWeight: '800', color: palette.tangerineDeep, marginBottom: scale(8) }}>+100p</Text>
        <View style={{ alignSelf: 'center', backgroundColor: palette.canolaSoft, borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(6), marginBottom: scale(16) }}>
          <Text style={{ color: palette.ink, fontWeight: '700', fontSize: scale(12) }}>줍기 어려운 쓰레기 보너스 (기준 연구 중)</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: scale(10) }}>
          <FigButton label="하나 더 줍기" tone="white" onPress={() => router.replace('/camera')} />
          <FigButton label="섬으로 돌아가기" onPress={() => router.replace('/home')} />
        </View>
      </View>
    </FigScreen>
  );
}
