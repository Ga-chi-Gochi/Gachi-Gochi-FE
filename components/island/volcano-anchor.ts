import { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { ISLAND_STAGE_ART, toIslandStage } from '@/constants/island-stages';

export const CELL = 32;

const VOLCANO_ART_W = 4 * CELL;
const VOLCANO_ART_H = 3 * CELL;

export function craterCloudPoint(stage: number) {
  const art = ISLAND_STAGE_ART[toIslandStage(stage)];
  const [x0, , x1] = art.volcanoBox;
  const [ax, ay] = art.volcanoAnchor;
  const scale = (x1 - x0) / VOLCANO_ART_W;
  return {
    x: ax,
    y: ay - VOLCANO_ART_H * scale + 6 * scale,
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
