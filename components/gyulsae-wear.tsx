import { Image } from 'expo-image';
import { Platform, View } from 'react-native';

import { PixelAligned } from '@/components/pixel-aligned';
import { growthSpriteId, PixelSprite } from '@/components/pixel/pixel-sprite';
import { wearStageForLevel } from '@/constants/shop-art';
import { WEAR_ART_PIXELS, WEAR_HD } from '@/constants/wear-art';
import { wearLayers, wearSlotOf, type EquippedWear } from '@/constants/wear-slots';
import { snapArt } from '@/lib/pixel-snap';

const crispStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type GyulsaeWearProps = {
  level: number;
  size: number;
  equipped: EquippedWear;
  preview?: string | null;
};

export function GyulsaeWear({ level, size, equipped, preview = null }: GyulsaeWearProps) {
  const box = snapArt(size, WEAR_ART_PIXELS);
  const stage = wearStageForLevel(level);
  const { back, front } = wearLayers(equipped, preview);
  const layer = { position: 'absolute', left: 0, top: 0, width: box, height: box, ...crispStyle } as const;
  const wearImage = (itemId: string) => {
    if (stage === 'egg' && wearSlotOf(itemId) === 'face') {
      return null;
    }
    const source = WEAR_HD[itemId]?.[stage];
    return source ? <Image key={itemId} source={source} style={layer} contentFit="fill" /> : null;
  };

  return (
    <PixelAligned style={{ width: box, height: box }}>
      {back.map(wearImage)}
      <View style={{ position: 'absolute', left: 0, top: 0 }}>
        <PixelSprite id={growthSpriteId(level)} size={box} />
      </View>
      {front.map(wearImage)}
    </PixelAligned>
  );
}
