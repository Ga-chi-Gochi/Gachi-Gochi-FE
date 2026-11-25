import type { SpotlightHole } from '@/components/guide/guide-spotlight';

/**
 * 섬 오버레이 탐험 버튼과 같은 자리 (left: 12, top: 58%).
 * 스포트라이트 구멍용 — scale 은 useResponsive().scale.
 */
export function exploreButtonHole(
  scale: (value: number) => number,
  windowHeight: number,
): SpotlightHole {
  const width = scale(76);
  const height = scale(48);
  return {
    left: scale(12),
    top: windowHeight * 0.58,
    width,
    height,
    radius: scale(8),
  };
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
