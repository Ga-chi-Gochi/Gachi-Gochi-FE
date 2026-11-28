import { PixelRatio } from 'react-native';

export function snapArt(points: number, artPixels: number): number {
  const ratio = PixelRatio.get();
  const multiple = Math.max(1, Math.round((points * ratio) / artPixels));
  return (multiple * artPixels) / ratio;
}

export function snapPoint(points: number): number {
  return PixelRatio.roundToNearestPixel(points);
}
