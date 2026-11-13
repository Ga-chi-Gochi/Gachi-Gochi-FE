import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { GochiEggSection } from '@/components/inventory/gochi-egg-section';
import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelChip, PixelPanel, PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { shopItems } from '@/constants/content';
import { ISLAND_ZONES } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { ISLAND_HOME } from '@/constants/routes';
import { useResponsive } from '@/hooks/use-responsive';

export default function InventoryScreen() {
  const { scale } = useResponsive();
  const {
    owned,
    placed,
    removeDecor,
    startPlacing,
    exploreEggCount,
    gochiEggs,
    newGochiEggIds,
    markGochiEggDetailSeen,
  } = usePlayState();
  const items = shopItems.filter((item) => owned.includes(item.id));
  const [selectedEggId, setSelectedEggId] = useState<string | null>(null);

  return (
    <PixelScreen sky={false}>
      <View style={{ paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(10), gap: scale(6) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            hitSlop={scale(8)}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.navigate(ISLAND_HOME);
            }}
            style={{
              borderWidth: scale(2),
              borderColor: pixel.ink,
              backgroundColor: pixel.white,
              padding: scale(4),
            }}>
            <MaterialIcons name="arrow-back" size={scale(20)} color={pixel.ink} />
          </Pressable>
          <PixelText size={26}>인벤토리</PixelText>
        </View>
        <PixelText size={13} color={pixel.muted}>
          고치 알과 섬 꾸미기 아이템을 보관해요.
        </PixelText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: scale(24), gap: scale(16) }}>
        <GochiEggSection
          eggs={gochiEggs}
          newEggIds={newGochiEggIds}
          selectedId={selectedEggId}
          onSelect={setSelectedEggId}
          onCloseDetail={() => setSelectedEggId(null)}
          onMarkSeen={(id) => {
            void markGochiEggDetailSeen(id);
          }}
        />

        <View style={{ gap: scale(8) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <PixelText size={16}>꾸미기 아이템</PixelText>
            <PixelChip label={`${items.length}개`} bg={pixel.white} />
          </View>

          {items.length === 0 ? (
            <PixelPanel style={{ gap: scale(10), alignItems: 'center' }}>
              <PixelSprite id="lock" size={scale(40)} />
              <PixelText size={13} color={pixel.muted} center>
                아직 꾸미기 아이템이 없어요.{'\n'}상점이나 로컬 상점 보상으로 모아보세요.
              </PixelText>
              <View style={{ flexDirection: 'row', gap: scale(8) }}>
                <PixelButton label="상점 가기" onPress={() => router.push('/(tabs)/shop')} />
                <PixelButton label="퀘스트" tone="ghost" onPress={() => router.push('/(tabs)/quest')} />
              </View>
              {exploreEggCount > 0 ? (
                <PixelText size={11} color={pixel.leaf} center>
                  고치 알 {exploreEggCount}개는 위 칸에 있어요
                </PixelText>
              ) : null}
            </PixelPanel>
          ) : (
            items.map((item) => {
              const placedEntry = placed.find((entry) => entry.itemId === item.id);
              const zone = placedEntry ? ISLAND_ZONES.find((entry) => entry.id === placedEntry.zoneId) : null;
              const preferred = item.preferredZone
                ? ISLAND_ZONES.find((entry) => entry.id === item.preferredZone)
                : null;
              return (
                <PixelPanel key={item.id} style={{ gap: scale(10) }}>
                  <View style={{ flexDirection: 'row', gap: scale(12), alignItems: 'center' }}>
                    <View
                      style={{
                        width: scale(56),
                        height: scale(56),
                        borderWidth: scale(2),
                        borderColor: pixel.ink,
                        backgroundColor: pixel.grass,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <PixelSprite id={item.sprite} size={scale(36)} />
                    </View>
                    <View style={{ flex: 1, gap: scale(4) }}>
                      <PixelText size={16}>{item.name}</PixelText>
                      <PixelText size={12} color={pixel.muted}>
                        {item.detail}
                      </PixelText>
                      {placedEntry ? (
                        <PixelChip label={`배치: ${zone?.name ?? placedEntry.zoneId}`} bg={pixel.sand} />
                      ) : (
                        <PixelChip
                          label={preferred ? `추천: ${preferred.name}` : '보관중'}
                          bg={pixel.white}
                        />
                      )}
                    </View>
                  </View>

                  {placedEntry ? (
                    <PixelButton label="섬에서 걷어내기" tone="ghost" onPress={() => removeDecor(item.id)} />
                  ) : (
                    <PixelButton
                      label="섬에서 배치하기"
                      tone="green"
                      onPress={() => {
                        const ok = startPlacing(item.id);
                        if (!ok) {
                          Alert.alert('배치할 수 없어요', '이미 배치됐거나 없는 아이템이에요.');
                          return;
                        }
                        router.push('/(tabs)');
                      }}
                    />
                  )}
                </PixelPanel>
              );
            })
          )}
        </View>
      </ScrollView>
    </PixelScreen>
  );
}
