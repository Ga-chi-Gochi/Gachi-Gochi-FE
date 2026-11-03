import { Pressable, View } from 'react-native';

import { CollectionImage } from '@/components/collection-image';
import { CollectionTags } from '@/components/collection-tags';
import { PixelText } from '@/components/pixel/pixel-ui';
import {
  formatCollectionNo,
  isCollectionCurrent,
  isCollectionDiscovered,
  type CollectionEntry,
} from '@/constants/collection';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function CollectionCard({
  entry,
  width,
  onPress,
}: {
  entry: CollectionEntry;
  width: number;
  onPress: (entry: CollectionEntry) => void;
}) {
  const { scale } = useResponsive();
  const discovered = isCollectionDiscovered(entry);
  const current = discovered && isCollectionCurrent(entry);
  const padding = scale(10);
  const borderWidth = scale(current ? 4 : pixel.border);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={discovered ? entry.name : `${formatCollectionNo(entry.no)} 미발견`}
      onPress={() => onPress(entry)}
      style={({ pressed }) => ({
        width,
        padding,
        gap: scale(6),
        backgroundColor: pixel.panel,
        borderWidth,
        borderColor: current ? pixel.tangerine : pixel.ink,
        opacity: pressed ? 0.85 : 1,
      })}>
      <CollectionImage entry={entry} discovered={discovered} size={width - padding * 2 - borderWidth * 2} />
      <PixelText size={11} color={pixel.muted}>
        {formatCollectionNo(entry.no)}
      </PixelText>
      <PixelText size={15}>{discovered ? entry.name : '???'}</PixelText>
      <View style={{ minHeight: scale(24) }}>{discovered ? <CollectionTags tags={entry.tags} /> : null}</View>
    </Pressable>
  );
}
