import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export function TopBar({ title, light = false }: { title: string; light?: boolean }) {
  const { scale } = useResponsive();
  const color = light ? palette.white : palette.ink;

  return (
    <View style={{ height: scale(56), flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(8) }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="뒤로"
        onPress={() => router.back()}
        hitSlop={8}
        style={{ width: scale(42), height: scale(42), alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name="arrow-back" size={scale(22)} color={color} />
      </Pressable>
      <Text style={{ flex: 1, textAlign: 'center', color, fontSize: scale(17), fontWeight: '700' }}>{title}</Text>
      <View style={{ width: scale(42) }} />
    </View>
  );
}
