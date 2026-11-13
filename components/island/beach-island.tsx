import { Pressable, View } from 'react-native';

import { BeachPlay } from '@/components/island/beach-play';
import { PetCreature } from '@/components/island/pet-creature';
import { PlaceGuideBanner } from '@/components/island/place-mode';
import { PixelButton, PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { getShopItem } from '@/constants/content';
import { ISLAND_ZONES } from '@/constants/island-zones';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type BeachIslandProps = {
  petOpen: boolean;
  onPet: () => void;
  onClosePet: () => void;
};

/** 해변 자체가 섬이다. 걷기, 배치, 확장, 성장은 해변 위에서 한다. */
export function BeachIsland({ petOpen, onPet, onClosePet }: BeachIslandProps) {
  const { scale } = useResponsive();
  const {
    growthStage,
    pendingPlaceItemId,
    cancelPlacing,
    canExpand,
    growCreature,
    expandIsland,
    petCreature,
  } = usePlayState();

  const pendingItem = pendingPlaceItemId ? getShopItem(pendingPlaceItemId) : null;
  const preferredName = pendingItem?.preferredZone
    ? ISLAND_ZONES.find((zone) => zone.id === pendingItem.preferredZone)?.name
    : undefined;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: petOpen ? 50 : 5 }}>
      {pendingPlaceItemId ? (
        <View style={{ position: 'absolute', top: '14%', left: scale(12), right: scale(88), zIndex: 6 }}>
          <PlaceGuideBanner itemId={pendingPlaceItemId} preferredZoneName={preferredName} onCancel={cancelPlacing} />
        </View>
      ) : null}

      <BeachPlay petOpen={petOpen} onPet={onPet} />

      <View style={{ position: 'absolute', top: '20%', left: scale(12), width: scale(112), gap: scale(8), zIndex: 6 }}>
        <PixelButton label="키우기" tone="green" onPress={() => void growCreature()} />
        <PixelButton label="섬 넓히기" disabled={!canExpand} onPress={() => expandIsland()} />
      </View>

      {petOpen ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(26,21,32,0.28)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: scale(12),
          }}>
          <View
            style={{
              width: '100%',
              maxWidth: scale(300),
              backgroundColor: pixel.panel,
              borderWidth: scale(pixel.border),
              borderColor: pixel.ink,
              alignItems: 'center',
              gap: scale(8),
              paddingVertical: scale(14),
              paddingHorizontal: scale(10),
            }}>
            <PixelText size={14} center>
              쓰담쓰담
            </PixelText>
            <PetCreature growthStage={growthStage} onPetComplete={() => void petCreature()} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="쓰다듬기 닫기"
              onPress={onClosePet}
              style={{
                marginTop: scale(4),
                paddingHorizontal: scale(16),
                paddingVertical: scale(8),
                borderWidth: scale(2),
                borderColor: pixel.ink,
                backgroundColor: pixel.white,
              }}>
              <PixelText size={13}>닫기</PixelText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
