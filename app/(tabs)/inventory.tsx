import { router } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelChip, PixelPanel, PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { shopItems } from '@/constants/content';
import { ISLAND_ZONES } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export default function InventoryScreen() {
  const { scale } = useResponsive();
  const { owned, placed, removeDecor, startPlacing } = usePlayState();
  const items = shopItems.filter((item) => owned.includes(item.id));

  return (
    <PixelScreen sky={false}>
      <View style={{ paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(10), gap: scale(6) }}>
        <PixelText size={26}>인벤토리</PixelText>
        <PixelText size={13} color={pixel.muted}>
          아이템을 고르면 섬에서 배치 가이드가 열려요.
        </PixelText>
      </View>

      {items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(28), gap: scale(12) }}>
          <PixelSprite id="lock" size={scale(48)} />
          <PixelText size={16} center>
            아직 가진 아이템이 없어요
          </PixelText>
          <PixelText size={12} color={pixel.muted} center>
            상점에서 귤로 사거나, 로컬 상점 방문 보상으로 모아보세요.
          </PixelText>
          <View style={{ flexDirection: 'row', gap: scale(8) }}>
            <PixelButton label="상점 가기" onPress={() => router.push('/(tabs)/shop')} />
            <PixelButton label="퀘스트" tone="ghost" onPress={() => router.push('/(tabs)/quest')} />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: scale(24), gap: scale(10) }}>
          {items.map((item) => {
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
          })}
        </ScrollView>
      )}
    </PixelScreen>
  );
}
