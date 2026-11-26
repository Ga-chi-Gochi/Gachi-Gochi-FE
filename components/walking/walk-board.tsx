import { Image } from 'expo-image';
import { View } from 'react-native';

import { snapArt, walkArt, walkColor, walkPanel, walkPixelImage } from '@/components/walking/walk-assets';
import { WalkText } from '@/components/walking/walk-text';
import { WALKING_GOAL } from '@/constants/walking-reward';
import { useResponsive } from '@/hooks/use-responsive';

const ROWS = [
  [walkPanel.tl, walkPanel.t, walkPanel.t, walkPanel.t, walkPanel.tr],
  [walkPanel.l, walkPanel.c, walkPanel.c, walkPanel.c, walkPanel.r],
  [walkPanel.bl, walkPanel.bAlt1, walkPanel.b, walkPanel.bAlt2, walkPanel.br],
];

export const WALK_BOARD = { width: 254, height: 152 };

const INNER = { top: 1, bottom: 3 };
const SIDE_PADDING = 12;
const GLYPH_WIDTH = 0.64;
const GOAL_SIZE = 19;
const NUMBER_MAX = 48;
const NUMBER_MIN = 32;

export function useWalkBoardSize() {
  const { scale } = useResponsive();
  const piece = snapArt(scale(WALK_BOARD.width) / 5, walkArt.panel);
  return { piece, width: piece * 5, height: piece * 3 };
}

type WalkBoardProps = {
  stepsLabel: string;
  statsLabel: string;
  accessibilityLabel: string;
};

export function WalkBoard({ stepsLabel, statsLabel, accessibilityLabel }: WalkBoardProps) {
  const { scale, factor } = useResponsive();
  const { piece, width, height } = useWalkBoardSize();
  const unit = piece / walkArt.panel;
  const goalLabel = `/${WALKING_GOAL}`;
  const slashWidth = goalLabel.length * GLYPH_WIDTH * scale(GOAL_SIZE) + scale(2);
  const available = width - unit * 2 - scale(SIDE_PADDING) * 2;
  const fitted = (available - slashWidth) / (Math.max(1, stepsLabel.length) * GLYPH_WIDTH * factor);
  const numberSize = Math.max(NUMBER_MIN, Math.min(NUMBER_MAX, Math.floor(fitted)));

  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={{ width, height, alignSelf: 'center' }}>
      {ROWS.map((row, y) =>
        row.map((source, x) => (
          <Image
            key={`${x}-${y}`}
            source={source}
            style={{ position: 'absolute', left: x * piece, top: y * piece, width: piece, height: piece, ...walkPixelImage }}
            contentFit="fill"
          />
        )),
      )}
      <View
        style={{
          position: 'absolute',
          left: unit,
          right: unit,
          top: unit * INNER.top,
          bottom: unit * INNER.bottom,
          alignItems: 'center',
          justifyContent: 'center',
          gap: scale(6),
        }}>
        <WalkText size={16} center color={walkColor.ink}>
          {statsLabel}
        </WalkText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
          <WalkText size={numberSize} color={walkColor.boardNumber} numberOfLines={1} style={{ lineHeight: scale(numberSize) }}>
            {stepsLabel}
          </WalkText>
          <WalkText size={GOAL_SIZE} color={walkColor.boardNumber} style={{ lineHeight: scale(GOAL_SIZE), marginLeft: scale(2) }}>
            {goalLabel}
          </WalkText>
        </View>
      </View>
    </View>
  );
}
