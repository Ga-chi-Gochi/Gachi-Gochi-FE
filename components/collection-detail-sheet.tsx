import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollectionImage } from '@/components/collection-image';
import { CollectionTags } from '@/components/collection-tags';
import { PixelText } from '@/components/pixel/pixel-ui';
import { formatCollectionNo, isCollectionDiscovered, type CollectionEntry } from '@/constants/collection';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function CollectionDetailSheet({ entry, onClose }: { entry: CollectionEntry | null; onClose: () => void }) {
  const { scale, height } = useResponsive();
  const insets = useSafeAreaInsets();
  const discovered = entry ? isCollectionDiscovered(entry) : false;

  return (
    <Modal visible={entry !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityLabel="닫기"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(26, 21, 32, 0.45)' }}
        />
        {entry ? (
          <View
            style={{
              maxHeight: height * 0.85,
              backgroundColor: pixel.paper,
              borderTopWidth: scale(pixel.border),
              borderLeftWidth: scale(pixel.border),
              borderRightWidth: scale(pixel.border),
              borderColor: pixel.ink,
              paddingTop: scale(12),
              paddingBottom: insets.bottom + scale(16),
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: scale(12) }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                onPress={onClose}
                hitSlop={8}
                style={{
                  width: scale(36),
                  height: scale(36),
                  borderWidth: scale(2),
                  borderColor: pixel.ink,
                  backgroundColor: pixel.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcons name="close" size={scale(20)} color={pixel.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: scale(20), gap: scale(10), alignItems: 'center' }}>
              <CollectionImage entry={entry} discovered={discovered} size={scale(160)} />
              <PixelText size={12} color={pixel.muted} center>
                {formatCollectionNo(entry.no)}
              </PixelText>
              <PixelText size={20} center>
                {discovered ? entry.name : '???'}
              </PixelText>
              {discovered ? (
                <>
                  <CollectionTags tags={entry.tags} center />
                  <View style={{ alignSelf: 'stretch', gap: scale(4), marginTop: scale(6) }}>
                    <PixelText size={14}>설명</PixelText>
                    <PixelText size={13} color={pixel.muted}>
                      {entry.description}
                    </PixelText>
                  </View>
                </>
              ) : (
                <PixelText size={14} color={pixel.muted} center>
                  아직 만나지 못했어요
                </PixelText>
              )}
              <View
                style={{
                  alignSelf: 'stretch',
                  gap: scale(4),
                  marginTop: scale(6),
                  padding: scale(12),
                  backgroundColor: pixel.panel,
                  borderWidth: scale(2),
                  borderColor: pixel.ink,
                }}>
                <PixelText size={14}>{discovered ? '얻는 방법' : '힌트'}</PixelText>
                <PixelText size={13} color={pixel.muted}>
                  {entry.howToGet}
                </PixelText>
              </View>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
