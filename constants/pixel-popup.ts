export const POPUP_COLORS = {
  outline: '#000000',
  frame: '#99573c',
  frameLight: '#b86848',
  frameDark: '#854b33',
  fill: '#d9c39b',
  fillLight: '#f2e9c7',
  fillSide: '#e5d0aa',
  fillDark: '#8e7958',
  text: '#4d352d',
  dim: 'rgba(26, 21, 32, 0.55)',
} as const;

export const POPUP_BUTTON_COLORS = {
  green: { light: '#8ec55c', fill: '#78b943', dark: '#5ca025', base: '#46792d', text: '#ffffff', textShadow: '#0f460a' },
  beige: { light: '#f2e9c7', fill: '#d9c39b', dark: '#8e7958', base: '#756348', text: '#4d352d', textShadow: 'transparent' },
} as const;

export const POPUP_DOT = 2;
export const POPUP_MAX_WIDTH = 336;
export const POPUP_IMAGE_BUTTON = { width: 136, height: 40 } as const;
