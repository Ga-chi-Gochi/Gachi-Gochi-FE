import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

const tabs = [
  { label: '홈', icon: 'home' as const },
  { label: '지도', icon: 'map' as const },
  { label: '도감', icon: 'menu-book' as const },
  { label: '마이', icon: 'person' as const },
];

export function TabBar({ active = '홈' }: { active?: string }) {
  const { scale } = useResponsive();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: palette.white,
        borderTopWidth: 1,
        borderTopColor: palette.line,
        paddingTop: scale(8),
        paddingBottom: scale(6),
      }}>
      {tabs.map((tab) => {
        const selected = tab.label === active;
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              if (tab.label === '홈') {
                router.navigate('/home');
              }
            }}
            style={{ flex: 1, alignItems: 'center', gap: scale(2) }}>
            <MaterialIcons name={tab.icon} size={scale(22)} color={selected ? palette.tangerine : palette.muted} />
            <Text style={{ fontSize: scale(11), fontWeight: '700', color: selected ? palette.tangerine : palette.muted }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
