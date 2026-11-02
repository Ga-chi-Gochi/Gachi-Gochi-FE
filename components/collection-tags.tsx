import { View } from 'react-native';

import { PixelChip } from '@/components/pixel/pixel-ui';
import { COLLECTION_TAG_COLOR, type CollectionTag } from '@/constants/collection';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function CollectionTags({ tags, center }: { tags: CollectionTag[]; center?: boolean }) {
  const { scale } = useResponsive();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(4), justifyContent: center ? 'center' : 'flex-start' }}>
      {tags.map((tag) => (
        <PixelChip key={tag} label={tag} color={pixel.white} bg={COLLECTION_TAG_COLOR[tag]} />
      ))}
    </View>
  );
}
