import type { ImageSource } from 'expo-image';

/**
 * 기디/디자인에서 픽셀 이미지를 주면 여기에만 넣으면 됩니다.
 * 값이 있으면 PixelSprite가 이미지를 쓰고, 없으면 코드 도트 스프라이트를 씁니다.
 *
 * 예:
 *   egg: require('@/assets/pixel/egg.png'),
 */
export type PixelSpriteId =
  | 'egg'
  | 'sprout'
  | 'buddy'
  | 'gachi'
  | 'tree'
  | 'house'
  | 'pebble'
  | 'canola'
  | 'island'
  | 'volcano'
  | 'volcano-erupt'
  | 'tangerine'
  | 'lock'
  | 'seed';

export const PIXEL_ASSETS: Partial<Record<PixelSpriteId, ImageSource>> = {
  // 교체 슬롯 (비워 두면 절차적 도트 사용)
};
