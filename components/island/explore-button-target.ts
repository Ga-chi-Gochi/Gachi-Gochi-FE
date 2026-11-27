import type { IslandCameraState } from '@/components/island/island-game';
import type { SpotlightHole } from '@/components/guide/guide-spotlight';
import {
  ISLAND_FOREST_ART,
  ISLAND_FOREST_SHARE,
  ISLAND_STAGE3_ART,
} from '@/constants/island-zones';

export { ISLAND_FOREST_SHARE };

/**
 * game/src/scene.ts HOME 과 동일.
 * 카메라 메시지가 오기 전에도 섬 위 숲 자리를 대략 맞출 때 쓴다.
 */
const HOME = { width: 390, height: 844, centerX: 204, centerY: 488, tile: 40, spanX: 340, spanY: 552 };
const CELL = 32;

/** 아트 좌표 기준 탐험 숲 프레임 (forest.png) */
export function exploreForestArt() {
  return { ...ISLAND_FOREST_ART };
}

/** @deprecated exploreForestArt / ISLAND_FOREST_SHARE 사용 */
export function exploreWestLandShare() {
  return { ...ISLAND_FOREST_SHARE };
}

/** @deprecated exploreWestLandShare 사용 */
export const EXPLORE_WEST_FRAME = exploreWestLandShare();

/**
 * 섬 월드 좌표 → 화면 좌표.
 * island-game 주석과 동일: w/2 + (world − w/2) × zoom + x
 * (world × zoom + x 는 zoom≠1 일 때 바다 쪽으로 어긋난다)
 */
export function islandWorldToScreen(
  camera: Pick<IslandCameraState, 'zoom' | 'x' | 'y' | 'w' | 'h'>,
  worldX: number,
  worldY: number,
) {
  const zoom = camera.zoom || 1;
  const midX = (camera.w || 0) / 2;
  const midY = (camera.h || 0) / 2;
  return {
    x: midX + (worldX - midX) * zoom + camera.x,
    y: midY + (worldY - midY) * zoom + camera.y,
  };
}

export function islandWorldBoxToScreen(
  camera: Pick<IslandCameraState, 'zoom' | 'x' | 'y' | 'w' | 'h'>,
  box: { left: number; top: number; width: number; height: number },
) {
  const zoom = camera.zoom || 1;
  const origin = islandWorldToScreen(camera, box.left, box.top);
  return {
    left: origin.x,
    top: origin.y,
    width: box.width * zoom,
    height: box.height * zoom,
  };
}

function forestScreenFromCamera(camera: Pick<IslandCameraState, 'zoom' | 'x' | 'y' | 'w' | 'h'>) {
  const f = ISLAND_FOREST_ART;
  return islandWorldBoxToScreen(camera, {
    left: f.x,
    top: f.y,
    width: f.w,
    height: f.h,
  });
}

/** 기본 홈 카메라(확대·이동 없음)에서 숲이 놓일 화면 좌표. scene viewCenter 와 같은 식 */
function defaultForestScreen(windowWidth: number, windowHeight: number) {
  const art = ISLAND_STAGE3_ART;
  const fx = windowWidth / HOME.width;
  const fy = windowHeight / HOME.height;
  const tile = Math.min(
    HOME.tile * Math.min(fx, fy),
    (HOME.spanX * fx) / art.cols,
    (HOME.spanY * fy) / art.rows,
  );
  const zoom = tile / CELL;
  const sx0 = (windowWidth * HOME.centerX) / HOME.width;
  const sy0 = (windowHeight * HOME.centerY) / HOME.height;
  const cx = art.width / 2 + (windowWidth / 2 - sx0) / zoom;
  const cy = art.height / 2 + (windowHeight / 2 - sy0) / zoom;
  return forestScreenFromCamera({
    zoom,
    x: (windowWidth / 2 - cx) * zoom,
    y: (windowHeight / 2 - cy) * zoom,
    w: windowWidth,
    h: windowHeight,
  });
}

function asHole(screen: { left: number; top: number; width: number; height: number }): SpotlightHole | null {
  if (screen.width <= 0 || screen.height <= 0) {
    return null;
  }
  return {
    ...screen,
    radius: Math.min(16, screen.width * 0.08),
  };
}

/**
 * 게임 카메라로 섬 위 풀숲(forest.png) 화면 구멍.
 * west 구역이 아니라 FOREST_ART 를 직접 투영한다.
 */
export function exploreWestHoleFromCamera(camera: IslandCameraState): SpotlightHole | null {
  if (camera.w <= 0 || camera.h <= 0) {
    return null;
  }
  return asHole(forestScreenFromCamera(camera));
}

/** 터치·타이머용 숲 프레임. 카메라 없으면 홈 기본 시야로 추정 */
export function exploreForestFrameFromCamera(
  camera: IslandCameraState,
  fallbackWidth: number,
  fallbackHeight: number,
): { left: number; top: number; width: number; height: number } {
  if (camera.w > 0 && camera.h > 0) {
    return forestScreenFromCamera(camera);
  }
  return defaultForestScreen(fallbackWidth, fallbackHeight);
}

/**
 * 카메라 없을 때 홈 기본 시야 기준 숲 구멍.
 * (아트 비율 × 화면 크기 폴백은 화면 상단 바다를 가리키므로 쓰지 않는다.)
 */
export function exploreWestZoneHole(windowWidth: number, windowHeight: number): SpotlightHole {
  return (
    asHole(defaultForestScreen(windowWidth, windowHeight)) ?? {
      left: windowWidth * 0.12,
      top: windowHeight * 0.38,
      width: windowWidth * ISLAND_FOREST_SHARE.w,
      height: windowHeight * ISLAND_FOREST_SHARE.h,
      radius: Math.min(16, windowWidth * 0.03),
    }
  );
}

/** @deprecated 서쪽 숲 진입으로 바뀜. exploreWestZoneHole 사용 */
export function exploreButtonHole(
  _scale: (value: number) => number,
  windowHeight: number,
  windowWidth = 390,
): SpotlightHole {
  return exploreWestZoneHole(windowWidth, windowHeight);
}

/**
 * 홈 위쪽 탐험 완료 보상 팝업 (가운데, 문장·버튼 너비에 맞춤).
 * 실측 구멍이 없을 때 쓰는 대략 위치.
 */
export function exploreRewardPopupHole(
  scale: (value: number) => number,
  windowWidth: number,
): SpotlightHole {
  const width = scale(240);
  return {
    left: Math.max(scale(12), (windowWidth - width) / 2),
    top: scale(108),
    width,
    height: scale(108),
    radius: scale(10),
  };
}
