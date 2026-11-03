import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { PixelText } from '@/components/pixel/pixel-ui';
import { COLLECTION_SORT_OPTIONS, type CollectionSort } from '@/constants/collection';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function CollectionToolbar({
  query,
  onChangeQuery,
  sort,
  onChangeSort,
}: {
  query: string;
  onChangeQuery: (value: string) => void;
  sort: CollectionSort;
  onChangeSort: (value: CollectionSort) => void;
}) {
  const { scale } = useResponsive();
  const [open, setOpen] = useState(false);
  const selected = COLLECTION_SORT_OPTIONS.find((option) => option.value === sort) ?? COLLECTION_SORT_OPTIONS[0];

  return (
    <View style={{ gap: scale(8), zIndex: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: scale(6),
          minHeight: scale(44),
          paddingHorizontal: scale(10),
          backgroundColor: pixel.white,
          borderWidth: scale(pixel.border),
          borderColor: pixel.ink,
        }}>
        <MaterialIcons name="search" size={scale(20)} color={pixel.muted} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="이름으로 검색"
          placeholderTextColor={pixel.muted}
          returnKeyType="search"
          style={{ flex: 1, color: pixel.ink, fontSize: scale(14), fontWeight: '800', paddingVertical: scale(8) }}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => onChangeQuery('')} hitSlop={8}>
            <MaterialIcons name="close" size={scale(18)} color={pixel.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ alignSelf: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`정렬: ${selected.label}`}
          onPress={() => setOpen((prev) => !prev)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: scale(4),
            minHeight: scale(36),
            paddingHorizontal: scale(10),
            backgroundColor: pixel.white,
            borderWidth: scale(2),
            borderColor: pixel.ink,
          }}>
          <PixelText size={12}>{selected.label}</PixelText>
          <MaterialIcons name={open ? 'arrow-drop-up' : 'arrow-drop-down'} size={scale(20)} color={pixel.ink} />
        </Pressable>
        {open ? (
          <View
            style={{
              position: 'absolute',
              top: scale(40),
              right: 0,
              minWidth: scale(160),
              backgroundColor: pixel.white,
              borderWidth: scale(2),
              borderColor: pixel.ink,
              elevation: 6,
            }}>
            {COLLECTION_SORT_OPTIONS.map((option) => {
              const active = option.value === sort;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onChangeSort(option.value);
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: scale(12),
                    paddingVertical: scale(10),
                    backgroundColor: active ? pixel.sand : pixel.white,
                  }}>
                  <PixelText size={12}>{option.label}</PixelText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}
