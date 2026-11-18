import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { PixelRatio, View } from 'react-native';

import { createSheetFrame, SheetSprite } from '@/components/island/sheet-sprite';
import { usePlayState } from '@/components/play-state';
import { MOTION_SEQ, MOTION_STAGES, type MotionStageId } from '@/constants/island-motion';

const GYULSAE_STAGE_LABELS: Record<MotionStageId, string> = {
  egg: '알',
  juvenile: '어린 귤새',
  adult: '다 자란 귤새',
};

function stageIdFor(level: number): MotionStageId {
  if (level <= 1) {
    return 'egg';
  }
  if (level >= 4) {
    return 'adult';
  }
  return 'juvenile';
}

function getCrispSize(target: number, artSize: number) {
  const ratio = PixelRatio.get();
  const multiple = Math.max(1, Math.round((target * ratio) / artSize));
  return (multiple * artSize) / ratio;
}

export function WalkingGyulsae({ size }: { size: number }) {
  const { growthStage } = usePlayState();
  const focused = useIsFocused();
  const stageId = stageIdFor(growthStage.level);
  const seq = MOTION_SEQ[MOTION_STAGES[stageId].rest];
  const crispSize = getCrispSize(size, seq.artSize);
  const [frame] = useState(createSheetFrame);

  useEffect(() => {
    frame.set(0, 0);
    if (!focused || seq.sheet.frameCount <= 1) {
      return;
    }
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      timer = setTimeout(() => {
        index = (index + 1) % seq.sheet.frameCount;
        frame.set(index % seq.sheet.cols, Math.floor(index / seq.sheet.cols));
        tick();
      }, seq.frameMs[index] ?? seq.frameMs[0]);
    };
    tick();
    return () => clearTimeout(timer);
  }, [focused, frame, seq]);

  return (
    <View accessibilityRole="image" accessibilityLabel={`귤새 (${GYULSAE_STAGE_LABELS[stageId]})`} style={{ alignItems: 'center' }}>
      <View style={{ width: crispSize, height: crispSize }}>
        {seq.sheet.shadow ? (
          <SheetSprite source={seq.sheet.shadow} cols={seq.sheet.cols} rows={seq.sheet.rows} size={crispSize} frame={frame} style={{ position: 'absolute', left: 0, top: 0 }} />
        ) : null}
        <SheetSprite source={seq.sheet.body} cols={seq.sheet.cols} rows={seq.sheet.rows} size={crispSize} frame={frame} style={{ position: 'absolute', left: 0, top: 0 }} />
      </View>
    </View>
  );
}
