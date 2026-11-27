import type { IslandCameraState } from '@/components/island/island-game';
import type { SpotlightHole } from '@/components/guide/guide-spotlight';
import { EXPLORE_WEST_INSET, ISLAND_ZONE_SHARE } from '@/constants/island-zones';

export { EXPLORE_WEST_INSET };

/** 아트 비율 기준 탐험 육지 프레임 (west share + inset) */
export function exploreWestLandShare() {
  const west = ISLAND_ZONE_SHARE.west;
  return {
    x: west.x + west.w * EXPLORE_WEST_INSET.left,
    y: west.y + west.h * EXPLORE_WEST_INSET.top,
    w: west.w * EXPLORE_WEST_INSET.width,
    h: west.h * EXPLORE_WEST_INSET.height,
  };
}

/** @deprecated exploreWestLandShare 사용 */
export const EXPLORE_WEST_FRAME = exploreWestLandShare();

function insetBox(
  left: number,
  top: number,
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: left + width * EXPLORE_WEST_INSET.left,
    top: top + height * EXPLORE_WEST_INSET.top,
    width: width * EXPLORE_WEST_INSET.width,
    height: height * EXPLORE_WEST_INSET.height,
  };
}

/**
 * 게임 카메라가 준 west 구역(월드 좌표) → 화면 구멍.
 * 카메라가 아직 없으면 null.
 */
export function exploreWestHoleFromCamera(camera: IslandCameraState): SpotlightHole | null {
  const zone = camera.zones?.west;
  if (!zone || camera.w <= 0 || camera.h <= 0) {
    return null;
  }
  const zoom = camera.zoom || 1;
  const screen = insetBox(
    zone.left * zoom + camera.x,
    zone.top * zoom + camera.y,
    zone.width * zoom,
    zone.height * zoom,
  );
  if (screen.width <= 0 || screen.height <= 0) {
    return null;
  }
  return {
    ...screen,
    radius: Math.min(14, screen.width * 0.1),
  };
}

/**
 * 카메라 없을 때 대략 위치 (화면 비율 ≈ 아트 비율 가정).
 */
export function exploreWestZoneHole(windowWidth: number, windowHeight: number): SpotlightHole {
  const share = exploreWestLandShare();
  return {
    left: share.x * windowWidth,
    top: share.y * windowHeight,
    width: share.w * windowWidth,
    height: share.h * windowHeight,
    radius: Math.min(14, windowWidth * 0.028),
  };
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
