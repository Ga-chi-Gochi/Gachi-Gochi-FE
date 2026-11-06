/** iPhone 14/15 logical width. Pass Figma pixels through `scale()`. */
export const DESIGN_WIDTH = 390;

/** Smallest phones stay readable; tablets and desktop stop growing past large phones. */
export const MIN_SCALE = 0.8;
export const MAX_SCALE = 1.15;

export function getScaleFactor(windowWidth: number) {
  const raw = windowWidth / DESIGN_WIDTH;
  return Math.min(Math.max(raw, MIN_SCALE), MAX_SCALE);
}
