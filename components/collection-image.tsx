import { Image } from 'expo-image';
import { View } from 'react-native';

import type { CollectionEntry } from '@/constants/collection';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function CollectionImage({ entry, discovered, size }: { entry: CollectionEntry; discovered: boolean; size: number }) {
  const { scale } = useResponsive();
  const inner = size * 0.72;

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: pixel.white,
        borderWidth: scale(2),
        borderColor: pixel.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {entry.image ? (
        <Image
          source={entry.image}
          contentFit="contain"
          tintColor={discovered ? undefined : pixel.ink}
          style={{ width: inner, height: inner }}
        />
      ) : (
        <View
          style={{
            width: inner,
            height: inner,
            backgroundColor: discovered ? '#C9C4CE' : pixel.ink,
          }}
        />
      )}
    </View>
  );
}
