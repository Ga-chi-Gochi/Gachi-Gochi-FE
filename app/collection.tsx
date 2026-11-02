import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { CollectionCard } from '@/components/collection-card';
import { CollectionDetailSheet } from '@/components/collection-detail-sheet';
import { CollectionHelpModal } from '@/components/collection-help-modal';
import { CollectionToolbar } from '@/components/collection-toolbar';
import { PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import {
  COLLECTION_ENTRIES,
  isCollectionDiscovered,
  sortCollection,
  type CollectionEntry,
  type CollectionSort,
} from '@/constants/collection';
import { pixel } from '@/constants/pixel-theme';
import { ISLAND_HOME } from '@/constants/routes';
import { useResponsive } from '@/hooks/use-responsive';

const WIDE_SCREEN_WIDTH = 600;

export default function CollectionScreen() {
  const { scale, width } = useResponsive();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CollectionSort>('no-asc');
  const [selected, setSelected] = useState<CollectionEntry | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);

  const columns = width >= WIDE_SCREEN_WIDTH ? 3 : 2;
  const horizontalPadding = scale(16);
  const gap = scale(10);
  const cardWidth = Math.floor((width - horizontalPadding * 2 - gap * (columns - 1)) / columns);

  const discoveredCount = COLLECTION_ENTRIES.filter(isCollectionDiscovered).length;

  const entries = useMemo(() => {
    const keyword = query.trim();
    const filtered = keyword
      ? COLLECTION_ENTRIES.filter((entry) => isCollectionDiscovered(entry) && entry.name.includes(keyword))
      : COLLECTION_ENTRIES;
    return sortCollection(filtered, sort);
  }, [query, sort]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ISLAND_HOME);
    }
  };

  return (
    <PixelScreen sky={false}>
      <View style={{ height: scale(56), flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(8) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          onPress={goBack}
          hitSlop={8}
          style={{ width: scale(42), height: scale(42), alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="arrow-back" size={scale(22)} color={pixel.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <PixelText size={20} center>
            도감
          </PixelText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="도움말"
          onPress={() => setHelpVisible(true)}
          hitSlop={8}
          style={{ width: scale(42), height: scale(42), alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="help-outline" size={scale(22)} color={pixel.ink} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: horizontalPadding, gap: scale(8), zIndex: 10 }}>
        <CollectionToolbar query={query} onChangeQuery={setQuery} sort={sort} onChangeSort={setSort} />
        <PixelText size={13} color={pixel.muted}>
          {`${COLLECTION_ENTRIES.length}마리 중 ${discoveredCount}마리 발견`}
        </PixelText>
      </View>

      <FlatList
        key={columns}
        data={entries}
        numColumns={columns}
        keyExtractor={(entry) => String(entry.no)}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={{ gap }}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingTop: scale(10), paddingBottom: scale(24), gap }}
        ListEmptyComponent={
          <View style={{ paddingVertical: scale(40) }}>
            <PixelText size={13} color={pixel.muted} center>
              검색 결과가 없어요
            </PixelText>
          </View>
        }
        renderItem={({ item }) => <CollectionCard entry={item} width={cardWidth} onPress={setSelected} />}
      />

      <CollectionDetailSheet entry={selected} onClose={() => setSelected(null)} />
      <CollectionHelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} />
    </PixelScreen>
  );
}
