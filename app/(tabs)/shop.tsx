import { router } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelButton, PixelChip, PixelPanel, PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { shopItems } from '@/constants/content';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export default function ShopScreen() {
  const { scale } = useResponsive();
  const { coins, owned, buy, startPlacing } = usePlayState();

  return (
    <PixelScreen sky={false}>
      <View style={{ paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(10), gap: scale(6) }}>
        <PixelText size={26}>상점</PixelText>
        <PixelText size={13} color={pixel.muted}>
          귤로 치장 아이템을 사고, 섬에 바로 배치할 수 있어요.
        </PixelText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(4) }}>
          <PixelSprite id="tangerine" size={scale(22)} />
          <PixelChip label={`보유 귤 ${coins}`} bg={pixel.white} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: scale(24), gap: scale(10) }}>
        {shopItems.map((item) => {
          const has = owned.includes(item.id);
          return (
            <PixelPanel key={item.id} style={{ flexDirection: 'row', gap: scale(12), alignItems: 'center' }}>
              <View
                style={{
                  width: scale(64),
                  height: scale(64),
                  borderWidth: scale(2),
                  borderColor: pixel.ink,
                  backgroundColor: pixel.sky,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <PixelSprite id={item.sprite} size={scale(40)} />
              </View>
              <View style={{ flex: 1, gap: scale(4) }}>
                <PixelText size={16}>{item.name}</PixelText>
                <PixelText size={12} color={pixel.muted}>
                  {item.detail}
                </PixelText>
                <PixelText size={12} color={pixel.tangerine}>
                  귤 {item.price}
                </PixelText>
              </View>
              <PixelButton
                label={has ? '보유중' : '구매'}
                disabled={has}
                onPress={() => {
                  const ok = buy(item.id, item.price);
                  if (!ok) {
                    Alert.alert('구매할 수 없어요', has ? '이미 가진 아이템이에요.' : '귤이 부족해요.');
                    return;
                  }
                  Alert.alert('구매 완료', `${item.name}을(를) 얻었어요. 섬에 배치할까요?`, [
                    { text: '나중에', style: 'cancel' },
                    {
                      text: '섬에 배치',
                      onPress: () => {
                        startPlacing(item.id);
                        router.push('/(tabs)');
                      },
                    },
                  ]);
                }}
              />
            </PixelPanel>
          );
        })}
      </ScrollView>
    </PixelScreen>
  );
}
