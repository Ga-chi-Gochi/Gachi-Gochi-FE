import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, type Href } from 'expo-router';
import { Pressable } from 'react-native';

import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function CollectionButton() {
  const { scale } = useResponsive();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="도감"
      onPress={() => router.push('/collection' as Href)}
      hitSlop={4}
      style={({ pressed }) => ({
        width: scale(36),
        height: scale(36),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pixel.white,
        borderWidth: scale(2),
        borderColor: pixel.ink,
        opacity: pressed ? 0.8 : 1,
      })}>
      <MaterialIcons name="menu-book" size={scale(20)} color={pixel.ink} />
    </Pressable>
  );
}
