import { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

export const CELL = 32;

const VOLCANO_COLS = 4;
const BLOCK_CORE_MIN_TOP = 4;
const BLOCK_BEACH_FROM_CORE = 10;
const BLOCK_BEACH_ROWS = 2;
const BLOCK_ROWS_BELOW_BEACH = 4;

export function craterCloudPoint(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0 };
  }
  const rows = Math.floor(height / CELL);
  const coreTop = Math.max(BLOCK_CORE_MIN_TOP, rows - BLOCK_ROWS_BELOW_BEACH - BLOCK_BEACH_ROWS - BLOCK_BEACH_FROM_CORE);
  const center = Math.round(width / 2 / CELL);
  const originX = center - Math.floor(VOLCANO_COLS / 2);
  const originY = coreTop + 2;
  return {
    x: (originX + VOLCANO_COLS / 2) * CELL,
    y: originY * CELL + 6,
  };
}

type CameraRig = {
  zoom: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  web: { zoom: number; x: number; y: number } | null;
};

export const IslandCameraContext = createContext<CameraRig | null>(null);

export function useIslandCameraSnapshot() {
  const camera = useContext(IslandCameraContext);
  if (!camera) {
    return { zoom: 1, x: 0, y: 0 };
  }
  if (Platform.OS === 'web' && camera.web) {
    return camera.web;
  }
  return { zoom: camera.zoom.value, x: camera.tx.value, y: camera.ty.value };
}
