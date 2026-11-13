import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable } from 'react-native';

import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function CollectionButton({ size = 36, active = false }: { size?: number; active?: boolean }) {
  const { scale } = useResponsive();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="도감"
      accessibilityState={{ selected: active }}
      onPress={() => router.push('/collection' as Href)}
      hitSlop={4}
      style={({ pressed }) => ({
        width: scale(size),
        height: scale(size),
        padding: scale(2),
        backgroundColor: active ? pixel.tangerine : 'transparent',
        borderWidth: scale(2),
        borderColor: active ? pixel.ink : 'transparent',
        opacity: pressed ? 0.8 : 1,
      })}>
      <Image
        source={require('@/assets/pixel/icon-book.png')}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
      />
    </Pressable>
  );
}
