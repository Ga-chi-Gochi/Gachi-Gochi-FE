import { Image } from 'expo-image';
import { View } from 'react-native';

import { snapArt, walkArt, walkColor, walkPixelImage, walkUi } from '@/components/walking/walk-assets';
import { WalkText } from '@/components/walking/walk-text';
import { useResponsive } from '@/hooks/use-responsive';

const INNER = { left: 1, right: 29, top: 8, bottom: 29 };

export function WalkCoinBubble({ coins, size }: { coins: number; size: number }) {
  const { scale } = useResponsive();
  const box = snapArt(size, walkArt.bubbleCoin);
  const unit = box / walkArt.bubbleCoin;
  const icon = snapArt(scale(28), walkArt.tangerine);

  return (
    <View accessible accessibilityLabel={`내 귤코인은 ${coins}개 이우다`} style={{ width: box, height: box }}>
      <Image source={walkUi.bubbleCoin} style={{ position: 'absolute', left: 0, top: 0, width: box, height: box, ...walkPixelImage }} contentFit="fill" />
      <View
        style={{
          position: 'absolute',
          left: INNER.left * unit,
          top: INNER.top * unit,
          width: (INNER.right - INNER.left) * unit,
          height: (INNER.bottom - INNER.top) * unit,
          paddingHorizontal: unit * 1.5,
          justifyContent: 'center',
          gap: scale(2),
        }}>
        <WalkText size={14} regular color={walkColor.bubbleText}>
          내 귤코인은
        </WalkText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(3) }}>
          <Image source={walkUi.tangerine} style={{ width: icon, height: icon, ...walkPixelImage }} contentFit="fill" />
          <WalkText size={22} color={walkColor.bubbleText} numberOfLines={1} style={{ flexShrink: 1 }}>
            {coins}개
          </WalkText>
        </View>
        <WalkText size={14} regular color={walkColor.bubbleText} style={{ textAlign: 'right' }}>
          이우다.
        </WalkText>
      </View>
    </View>
  );
}
