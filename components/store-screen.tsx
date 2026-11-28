import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { StoreDetailSheet } from '@/components/store-detail-sheet';
import { StoreGrid } from '@/components/store-grid';
import { StoreHeader } from '@/components/store-header';
import { useStoreModeToggle } from '@/components/store-mode-toggle';
import { StorePopup, type StorePopupContent } from '@/components/store-popup';
import { StorePreview } from '@/components/store-preview';
import { pixel } from '@/constants/pixel-theme';
import { wearStageForLevel } from '@/constants/shop-art';
import { ISLAND_HOME } from '@/constants/routes';
import {
  getStoreProducts,
  STORE_TABS,
  type StorePreviewTab,
  type StoreProduct,
  type StoreTab,
} from '@/constants/store-items';
import { wearSlotOf } from '@/constants/wear-slots';
import { useResponsive } from '@/hooks/use-responsive';

const EGG_FACE_BLOCKED = '알이 깨어나면 살 수 있수다';
const EGG_FACE_NOTE = '알은 아직 눈이 없어서, 깨어나면 보여요.';

export function StoreScreen() {
  const { scale } = useResponsive();
  const { coins, owned, buy, startPlacing, equipped, equip, unequip, growthStage } = usePlayState();
  const [tab, setTab] = useState<StoreTab>('character');
  const [previewTab, setPreviewTab] = useState<StorePreviewTab>('character');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const mode = useStoreModeToggle();
  const [popup, setPopup] = useState<StorePopupContent | null>(null);
  const equipRef = useRef(equip);

  useEffect(() => {
    equipRef.current = equip;
  }, [equip]);

  const products = useMemo(() => getStoreProducts(tab), [tab]);
  const selected = products.find((product) => product.id === selectedId) ?? null;
  const selectedOwned = selected?.kind === 'item' && owned.includes(selected.id);
  const selectedSlot = selected ? wearSlotOf(selected.id) : null;
  const selectedWorn = selectedSlot != null && equipped[selectedSlot] === selected?.id;
  const selectedWear = selectedOwned && selectedSlot ? (selectedWorn ? 'unequip' : 'equip') : null;
  const isEgg = wearStageForLevel(growthStage.level) === 'egg';
  const eggFace = selectedSlot === 'face' && isEgg;
  const blockedLabel = eggFace && !selectedWorn ? EGG_FACE_BLOCKED : undefined;
  const note = eggFace && selectedWorn ? EGG_FACE_NOTE : undefined;
  const equippedIds = Object.values(equipped).filter((id): id is string => typeof id === 'string');

  const toggleWear = (product: StoreProduct) => {
    if (product.kind !== 'item') {
      return;
    }
    const slot = wearSlotOf(product.id);
    if (slot && equipped[slot] === product.id) {
      unequip(product.id);
      setSelectedId(null);
    } else {
      equip(product.id);
    }
    setSheetOpen(false);
  };

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
      setPopup({ title: '아직 준비 중이우다', message: '귤코인 사기는 곧 열리쿠다.' });
      return;
    }
    const ok = buy(product.id, product.price);
    if (!ok) {
      setPopup(
        owned.includes(product.id)
          ? { title: '이미 이수다', message: '벌써 가진 물건이우다.' }
          : { title: '귤이 모자라우다', message: `귤 ${product.price - coins}개 더 모아 옵서.` },
      );
      return;
    }
    setSheetOpen(false);
    if (product.tab === 'island') {
      setPopup({
        title: `${product.name} 샀수다!`,
        message: '섬에 바로 놓으카마씸?',
        buttons: [
          {
            label: '섬에 놓게',
            onPress: () => {
              startPlacing(product.id);
              router.navigate(ISLAND_HOME);
            },
          },
          { label: '호꼼 이따가', tone: 'beige' },
        ],
      });
      return;
    }
    const canWear = !(wearSlotOf(product.id) === 'face' && isEgg);
    setPopup({
      title: `${product.name} 샀수다!`,
      message: canWear ? '바로 입혀 보카마씸?' : undefined,
      buttons: canWear
        ? [
            { label: '착용허게', onPress: () => equipRef.current(product.id) },
            { label: '호꼼 이따가', tone: 'beige' },
          ]
        : undefined,
    });
  };
  return (
    <PixelScreen sky={false}>
      <StoreHeader />

      <View style={{ paddingHorizontal: scale(16), gap: scale(10) }}>
        <StorePreview
          tab={previewTab}
          modeActive={mode.active}
          onToggleMode={mode.toggle}
          selectedItemId={selected?.kind === 'item' && !(selected.tab === 'character' && selectedOwned) ? selected.id : null}
        />

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
        <StoreGrid
          products={products}
          selectedId={selectedId}
          ownedIds={owned}
          equippedIds={equippedIds}
          dimmedIds={isEgg ? products.filter((product) => wearSlotOf(product.id) === 'face').map((product) => product.id) : []}
          dimmedLabel="깨어나면"
          onSelect={selectProduct}
        />
      </View>

      <StoreDetailSheet
        product={sheetOpen ? selected : null}
        owned={selectedOwned}
        wear={selectedWear}
        blockedLabel={blockedLabel}
        note={note}
        onClose={() => setSheetOpen(false)}
        onPurchase={purchase}
        onWear={toggleWear}
      />
      <StorePopup content={popup} onClose={() => setPopup(null)} />
    </PixelScreen>
  );
}
