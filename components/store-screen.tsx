import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { StoreDetailSheet } from '@/components/store-detail-sheet';
import { StoreGrid } from '@/components/store-grid';
import { StoreHeader } from '@/components/store-header';
import { useStoreModeToggle } from '@/components/store-mode-toggle';
import { StorePreview } from '@/components/store-preview';
import { pixel } from '@/constants/pixel-theme';
import { ISLAND_HOME } from '@/constants/routes';
import {
  getStoreProducts,
  STORE_TABS,
  type StorePreviewTab,
  type StoreProduct,
  type StoreTab,
} from '@/constants/store-items';
import { useResponsive } from '@/hooks/use-responsive';

export function StoreScreen() {
  const { scale } = useResponsive();
  const { coins, owned, buy, startPlacing } = usePlayState();
  const [tab, setTab] = useState<StoreTab>('character');
  const [previewTab, setPreviewTab] = useState<StorePreviewTab>('character');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const mode = useStoreModeToggle();

  const products = useMemo(() => getStoreProducts(tab), [tab]);
  const selected = products.find((product) => product.id === selectedId) ?? null;
  const selectedOwned = selected?.kind === 'item' && owned.includes(selected.id);

  const changeTab = (next: StoreTab) => {
    setTab(next);
    setSelectedId(null);
    setSheetOpen(false);
    if (next !== 'coin' && next !== previewTab) {
      setPreviewTab(next);
      mode.reset();
    }
  };

  const selectProduct = (product: StoreProduct) => {
    setSelectedId(product.id);
    setSheetOpen(true);
  };

  const purchase = (product: StoreProduct) => {
    if (product.kind === 'coin') {
      Alert.alert('준비 중', '귤코인 구매는 준비 중이에요.');
      return;
    }
    const ok = buy(product.id, product.price);
    if (!ok) {
      if (owned.includes(product.id)) {
        Alert.alert('보유 중', '이미 가지고 있는 상품이에요.');
      } else {
        Alert.alert('귤이 부족해요', `귤 ${product.price - coins}개가 더 필요해요.`);
      }
      return;
    }
    setSheetOpen(false);
    if (product.tab === 'island') {
      Alert.alert('구매 완료', `${product.name}을(를) 얻었어요. 섬에 배치할까요?`, [
        { text: '나중에', style: 'cancel' },
        {
          text: '섬에 배치',
          onPress: () => {
            startPlacing(product.id);
            router.navigate(ISLAND_HOME);
          },
        },
      ]);
      return;
    }
    Alert.alert('구매 완료', `${product.name}을(를) 얻었어요.`);
  };

  return (
    <PixelScreen sky={false}>
      <StoreHeader />

      <View style={{ paddingHorizontal: scale(16), gap: scale(10) }}>
        <StorePreview tab={previewTab} modeActive={mode.active} onToggleMode={mode.toggle} />

        <View style={{ flexDirection: 'row', gap: scale(6) }}>
          {STORE_TABS.map((item) => {
            const active = item.id === tab;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => changeTab(item.id)}
                style={{
                  flex: 1,
                  paddingVertical: scale(9),
                  borderWidth: scale(2),
                  borderColor: pixel.ink,
                  backgroundColor: active ? pixel.tangerine : pixel.white,
                  alignItems: 'center',
                }}>
                <PixelText size={12} color={active ? pixel.white : pixel.ink}>
                  {item.label}
                </PixelText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flex: 1, marginTop: scale(12) }}>
        <StoreGrid products={products} selectedId={selectedId} ownedIds={owned} onSelect={selectProduct} />
      </View>

      <StoreDetailSheet
        product={sheetOpen ? selected : null}
        owned={selectedOwned}
        onClose={() => setSheetOpen(false)}
        onPurchase={purchase}
      />
    </PixelScreen>
  );
}
