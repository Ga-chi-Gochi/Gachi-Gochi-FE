import type { SpotlightHole } from '@/components/guide/guide-spotlight';

/**
 * 탐험 터치·가이드용 서쪽 숲 영역.
 * 바다·파도를 빼고, 밝은 서쪽 섬 육지(해안사~본섬 이음)만 잡는다.
 */
export const EXPLORE_WEST_FRAME = { x: 0.14, y: 0.33, w: 0.15, h: 0.28 } as const;

/**
 * 홈 섬 서쪽 숲 구역 스포트라이트.
 * 카메라 확대·이동이 없을 때(기본 홈) 화면 비율로 맞춘다.
 */
export function exploreWestZoneHole(windowWidth: number, windowHeight: number): SpotlightHole {
  return {
    left: EXPLORE_WEST_FRAME.x * windowWidth,
    top: EXPLORE_WEST_FRAME.y * windowHeight,
    width: EXPLORE_WEST_FRAME.w * windowWidth,
    height: EXPLORE_WEST_FRAME.h * windowHeight,
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
  // "고치가 무언가를 찾아왔수다!" + 패널 패딩 기준
  const width = scale(240);
  return {
    left: Math.max(scale(12), (windowWidth - width) / 2),
    top: scale(108),
    width,
    height: scale(108),
    radius: scale(10),
  };
}
