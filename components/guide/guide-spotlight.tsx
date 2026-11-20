import { type ReactNode } from 'react';
import { View } from 'react-native';

import { pixel } from '@/constants/pixel-theme';

const DIM = pixel.dim;
const STRIP = 3;

export type CircleHole = { centerX: number; centerY: number; radius: number };
/** 모서리가 둥근 네모 구멍. radius 는 모서리 반지름 */
export type RectHole = { left: number; top: number; width: number; height: number; radius: number };
export type SpotlightHole = CircleHole | RectHole;

/** 구멍이 차지하는 가장 작은 네모. 구멍 밖 터치를 막을 때 그 둘레를 막는 데 쓴다 */
export function holeBounds(hole: SpotlightHole) {
  if ('left' in hole) {
    return { left: hole.left, top: hole.top, right: hole.left + hole.width, bottom: hole.top + hole.height };
  }
  return {
    left: hole.centerX - hole.radius,
    top: hole.centerY - hole.radius,
    right: hole.centerX + hole.radius,
    bottom: hole.centerY + hole.radius,
  };
}

type GuideSpotlightProps = {
  width: number;
  height: number;
  /** 구멍이 하나일 때 */
  centerX?: number;
  centerY?: number;
  radius?: number;
  /** 구멍이 여럿일 때. 있으면 위의 centerX·centerY·radius 보다 우선한다 */
  holes?: SpotlightHole[];
  children?: ReactNode;
};

/** 한 줄(strip)에서 구멍 하나가 차지하는 가로 구간. 이 줄에 걸치지 않으면 null */
function holeSpan(hole: SpotlightHole, mid: number): [number, number] | null {
  if ('left' in hole) {
    const { left, top, width, height } = hole;
    if (mid <= top || mid >= top + height) {
      return null;
    }
    const radius = Math.min(hole.radius, width / 2, height / 2);
    // 위·아래 모서리 구간에서는 반원처럼 안쪽으로 좁아진다
    const fromCorner = mid < top + radius ? top + radius - mid : mid > top + height - radius ? mid - (top + height - radius) : 0;
    const inset = radius - Math.sqrt(Math.max(0, radius * radius - fromCorner * fromCorner));
    return [left + inset, left + width - inset];
  }
  const dy = mid - hole.centerY;
  if (Math.abs(dy) >= hole.radius) {
    return null;
  }
  const half = Math.sqrt(hole.radius * hole.radius - dy * dy);
  return [hole.centerX - half, hole.centerX + half];
}

/** 한 줄(strip)에서 구멍이 차지하는 가로 구간을 왼쪽부터 합쳐서 돌려준다. */
function holeSpans(holes: SpotlightHole[], mid: number, width: number) {
  const spans: [number, number][] = [];
  for (const hole of holes) {
    const span = holeSpan(hole, mid);
    if (span) {
      spans.push([Math.max(0, span[0]), Math.min(width, span[1])]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) {
      last[1] = Math.max(last[1], span[1]);
    } else {
      merged.push([span[0], span[1]]);
    }
  }
  return merged;
}

/** 화면을 반투명하게 덮고, 구멍 안만 아래 화면이 비치게 한다. */
export function GuideSpotlight({ width, height, centerX = 0, centerY = 0, radius = 0, holes, children }: GuideSpotlightProps) {
  const list = holes ?? [{ centerX, centerY, radius }];
  const strips = [];
  for (let top = 0; top < height; top += STRIP) {
    const spans = holeSpans(list, top + STRIP / 2, width);
    let cursor = 0;
    // 구멍 사이사이(와 양 끝)의 어두운 구간만 그린다
    for (const [left, right] of [...spans, [width, width] as [number, number]]) {
      if (left > cursor) {
        strips.push(
          <View
            key={`${top}-${cursor}`}
            pointerEvents="none"
            style={{ position: 'absolute', top, height: STRIP, left: cursor, width: left - cursor, backgroundColor: DIM }}
          />,
        );
      }
      cursor = Math.max(cursor, right);
    }
  }

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, width, height }}>
      {strips}
      {children}
    </View>
  );
}
