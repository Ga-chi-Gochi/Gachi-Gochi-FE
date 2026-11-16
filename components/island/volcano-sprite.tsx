import { AnimatedSprite, type Frame } from '@darrench3140/react-native-sprite-sheet';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { CELL } from '@/components/island/beach-tiles';

const sheet = require('@/assets/images/beach/volcano-erupt-sheet.png');

/** 휴화산 몸 4×3칸 위에, 용암이 튀어 오를 빈 칸 2줄. */
const FRAME_W = 412;
const FRAME_H = 515;
const FRAME_COUNT = 9;
const SHEET_W = FRAME_W * FRAME_COUNT;
const SHEET_H = FRAME_H;
const PAD_CELLS = 2;

const FRAMES: Frame[] = Array.from({ length: FRAME_COUNT }, (_, index) => ({
  frame: { x: index * FRAME_W, y: 0, w: FRAME_W, h: FRAME_H },
}));

/** 끓기 1–5, 터짐 6–8, 마지막은 다시 휴화산. */
const ERUPT_FRAMES = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const ANIMATIONS = { erupt: ERUPT_FRAMES };

const FPS = 6;
/** 프레임마다 1000/fps. 끝나면 휴화산 칸 그림으로 돌아간다. */
export const VOLCANO_ERUPT_MS = Math.round(ERUPT_FRAMES.length * (1000 / FPS));

export const volcanoSpriteSize = {
  width: CELL * 4,
  height: CELL * (3 + PAD_CELLS),
  pad: CELL * PAD_CELLS,
};

function usePixelSpriteImages() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    const id = 'volcano-sprite-pixel';
    if (document.getElementById(id)) {
      return;
    }
    const style = document.createElement('style');
    style.id = id;
    style.textContent = '#volcano-sprite img { image-rendering: pixelated; image-rendering: crisp-edges; }';
    document.head.appendChild(style);
  }, []);
}

/** 섬 넓히기를 누르는 동안만 재생한다. 쉬고 있을 때는 칸으로 나눈 휴화산을 쓴다. */
export function VolcanoSprite({ left, top, playToken }: { left: number; top: number; playToken: number }) {
  usePixelSpriteImages();
  return (
    <View
      nativeID="volcano-sprite"
      pointerEvents="none"
      style={{ position: 'absolute', left, top, width: volcanoSpriteSize.width, height: volcanoSpriteSize.height }}>
      <AnimatedSprite
        key={playToken}
        source={sheet}
        spriteSheetSize={{ width: SHEET_W, height: SHEET_H }}
        size={{ width: volcanoSpriteSize.width, height: volcanoSpriteSize.height }}
        offset={{ x: 0, y: 0 }}
        frameSize={{ width: FRAME_W, height: FRAME_H }}
        frames={FRAMES}
        columnRowMapping={[FRAME_COUNT]}
        defaultAnimationName="erupt"
        animations={ANIMATIONS}
        autoPlay
        inLoop={false}
        fps={FPS}
      />
    </View>
  );
}
