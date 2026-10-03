import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FigScreen } from '@/components/fig-screen';
import { TopBar } from '@/components/top-bar';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

const TOTAL = 10 * 60;

export default function StayScreen() {
  const { scale } = useResponsive();
  const [left, setLeft] = useState(TOTAL);

  useEffect(() => {
    if (left <= 0) {
      router.replace('/complete');
      return;
    }
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const minutes = String(Math.floor(left / 60)).padStart(2, '0');
  const seconds = String(left % 60).padStart(2, '0');

  return (
    <FigScreen colors={['#DDF5E7', '#FFF9F1']}>
      <TopBar title="도토리숲" />
      <View style={{ flex: 1, paddingHorizontal: scale(20) }}>
        <Image source={art.store} style={{ width: '100%', height: scale(170), borderRadius: scale(24) }} contentFit="cover" />
        <Text style={{ marginTop: scale(16), fontSize: scale(24), fontWeight: '800', color: palette.ink, lineHeight: scale(32) }}>
          10분 동안 가치고치도{'\n'}여기서 같이 놀래요!
        </Text>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: scale(220), height: scale(220), borderRadius: scale(110), borderWidth: scale(10), borderColor: palette.leaf, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white }}>
            <Image source={art.wave} style={{ width: scale(96), height: scale(100) }} contentFit="contain" />
          </View>
          <Text style={{ marginTop: scale(12), fontSize: scale(36), fontWeight: '800', color: palette.leafDeep }}>
            {minutes}:{seconds} <Text style={{ fontSize: scale(14), color: palette.muted }}>남음</Text>
          </Text>
          <View style={{ marginTop: scale(8), backgroundColor: palette.seaSoft, borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(5) }}>
            <Text style={{ color: palette.sea, fontWeight: '700', fontSize: scale(12) }}>앱을 켜둔 동안 머문 시간을 확인해요</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/complete')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12), backgroundColor: palette.white, borderRadius: scale(20), padding: scale(12), marginBottom: scale(12) }}>
          <View style={{ width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: palette.blush, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="receipt-long" size={scale(20)} color={palette.tangerineDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: palette.ink, fontSize: scale(14) }}>영수증 올리고 단골 쌓기</Text>
            <Text style={{ color: palette.muted, fontSize: scale(12), marginTop: scale(2) }}>구매 인증 시 단골 깊이 +1</Text>
          </View>
          <View style={{ backgroundColor: palette.blush, borderRadius: scale(14), paddingHorizontal: scale(12), paddingVertical: scale(10) }}>
            <Text style={{ fontWeight: '800', color: palette.tangerineDeep }}>찍기</Text>
          </View>
        </Pressable>
      </View>
    </FigScreen>
  );
}
