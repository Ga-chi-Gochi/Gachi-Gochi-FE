import { PixelRatio, Platform } from 'react-native';

export const walkPanel = {
  tl: require('@/assets/ui/walking/board/panel-tl.png'),
  t: require('@/assets/ui/walking/board/panel-t.png'),
  tr: require('@/assets/ui/walking/board/panel-tr.png'),
  l: require('@/assets/ui/walking/board/panel-l.png'),
  c: require('@/assets/ui/walking/board/panel-c.png'),
  r: require('@/assets/ui/walking/board/panel-r.png'),
  bl: require('@/assets/ui/walking/board/panel-bl.png'),
  b: require('@/assets/ui/walking/board/panel-b.png'),
  bAlt1: require('@/assets/ui/walking/board/panel-b-alt1.png'),
  bAlt2: require('@/assets/ui/walking/board/panel-b-alt2.png'),
  br: require('@/assets/ui/walking/board/panel-br.png'),
} as const;

export const walkUi = {
  back: require('@/assets/ui/walking/walk-btn-back.png'),
  help: require('@/assets/ui/walking/walk-btn-walk.png'),
  bubbleCoin: require('@/assets/ui/walking/walk-bubble-coin.png'),
  bubbleSmall: require('@/assets/ui/walking/walk-bubble-small.png'),
  check: require('@/assets/ui/walking/walk-check.png'),
  tangerine: require('@/assets/ui/walking/walk-tangerine.png'),
} as const;

export const walkArt = {
  panel: 16,
  button: 32,
  bubbleCoin: 32,
  bubbleSmall: 16,
  check: 16,
  tangerine: 15,
} as const;

export function snapArt(points: number, artPixels: number): number {
  const ratio = PixelRatio.get();
  const multiple = Math.max(1, Math.round((points * ratio) / artPixels));
  return (multiple * artPixels) / ratio;
}

export const walkColor = {
  ink: '#3D2E22',
  title: '#3B2A1E',
  boardNumber: '#1F2A1F',
  bubbleText: '#2E2E2D',
  black: '#1A1520',
  barOuter: '#403728',
  barLine: '#E5D0A1',
  barFill: '#64B062',
  barFillTop: '#6BBD69',
  barFillBottom: '#5DA35B',
  barFillEdge: '#569654',
  barEmpty: '#897555',
  barEmptyMid: '#867253',
  barEmptyEdge: '#816E50',
  green: '#78B943',
  greenShadow: '#46792D',
  beige: '#D9C39B',
  beigeTop: '#F2E9C7',
  beigeShadow: '#8E7958',
  beigeText: '#4D352D',
  gold: '#FFD27A',
  goldShadow: '#C99A3E',
  gray: '#C9C4BA',
  grayText: '#6E695F',
  wood: '#99573C',
  card: '#D9C39B',
  white: '#FFFDF8',
  background: '#F5E3B9',
  panel: '#F7EDD3',
  dim: 'rgba(26,21,32,0.6)',
} as const;

export const walkPixelImage = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;
