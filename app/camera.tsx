import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export default function CameraScreen() {
  const { scale } = useResponsive();

  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
      <Image source={art.trash} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} contentFit="cover" />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: scale(200), backgroundColor: 'rgba(26,23,31,0.35)' }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: scale(240), backgroundColor: 'rgba(26,23,31,0.45)' }} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), marginTop: scale(8) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={() => router.back()}
            style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="close" size={scale(22)} color={palette.ink} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(8) }}>
            <MaterialIcons name="delete-outline" size={scale(16)} color={palette.white} />
            <Text style={{ color: palette.white, fontWeight: '700' }}>쓰레기 줍기</Text>
          </View>
          <View style={{ width: scale(42) }} />
        </View>
        <View style={{ marginTop: scale(16), marginHorizontal: scale(48), backgroundColor: palette.white, borderRadius: scale(18), padding: scale(8), flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
          <Image source={art.idle} style={{ width: scale(36), height: scale(41) }} contentFit="contain" />
          <Text style={{ flex: 1, color: palette.ink, fontWeight: '700', fontSize: scale(14) }}>카메라를 켜고 쓰레기를 주워줘!</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: scale(250), height: scale(250), borderRadius: scale(24), borderWidth: 3, borderColor: palette.white }} />
        </View>
        <Text style={{ textAlign: 'center', color: palette.white, fontSize: scale(14), marginBottom: scale(16) }}>
          쓰레기가 화면 가운데 오게 맞춰주세요
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: scale(12) }}>
          <Image source={art.trash} style={{ width: scale(48), height: scale(48), borderRadius: scale(12) }} contentFit="cover" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="촬영"
            onPress={() => router.push('/recognize')}
            style={{ width: scale(80), height: scale(80), borderRadius: scale(40), borderWidth: scale(4), borderColor: palette.white, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: scale(62), height: scale(62), borderRadius: scale(31), backgroundColor: palette.white }} />
          </Pressable>
          <View style={{ width: scale(48), height: scale(48), borderRadius: scale(24), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="photo-camera" size={scale(22)} color={palette.ink} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
