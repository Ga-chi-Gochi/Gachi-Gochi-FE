import { type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { PixelButton, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

/** 가이드 글자 색. dark 는 밝은 배경 위, light 는 어두운 어둡힘 위 */
export type GuideTone = 'dark' | 'light';

const FRAME_MAX = 420;

/** 넓은 화면에서도 내용이 휴대폰 폭으로 모이게 한다 */
export function GuideFrame({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { scale } = useResponsive();
  return <View style={[{ width: '100%', maxWidth: scale(FRAME_MAX), alignSelf: 'center' }, style]}>{children}</View>;
}

/** 섬 위에 올리지 않는 장면의 배경. PixelScreen(하늘색 + 위쪽 진한 띠)과 같다 */
export function GuideBackdrop() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: pixel.sky }}>
      <View style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '42%', backgroundColor: pixel.skyDeep, opacity: 0.35 }} />
    </View>
  );
}

/** 건너뛰기(닫기)와 진행 표시. 모든 장 위에 한 번만 놓는다 */
export function GuideHeader({
  index,
  total,
  tone,
  closeLabel,
  onClose,
}: {
  index: number;
  total: number;
  tone: GuideTone;
  closeLabel: string;
  onClose: () => void;
}) {
  const { scale } = useResponsive();
  const color = tone === 'light' ? pixel.white : pixel.ink;
  const rest = tone === 'light' ? 'rgba(255,253,248,0.45)' : 'rgba(26,21,32,0.28)';
  return (
    <GuideFrame style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(24) }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        hitSlop={8}
        style={{ minWidth: scale(44), minHeight: scale(44), justifyContent: 'center' }}>
        <PixelText size={14} color={color}>
          {closeLabel}
        </PixelText>
      </Pressable>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="가이드 진행"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-valuetext={`${total}장 중 ${index + 1}장`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
        {Array.from({ length: total }, (_, page) => {
          const active = page === index;
          return (
            <View
              key={page}
              style={{
                width: scale(active ? 20 : 8),
                height: scale(8),
                backgroundColor: active ? pixel.tangerine : rest,
                borderWidth: active ? scale(2) : 0,
                borderColor: color,
              }}
            />
          );
        })}
      </View>
    </GuideFrame>
  );
}

/** 도트 무대. 알과 귤새가 모래 위에 서 있는 네모 프레임 */
export function GuideStage({ size, children }: { size: number; children: ReactNode }) {
  const { scale } = useResponsive();
  const border = scale(pixel.border);
  const sand = size * 0.3;
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: pixel.panel,
        borderWidth: border,
        borderColor: pixel.ink,
        overflow: 'hidden',
      }}>
      <View style={{ position: 'absolute', right: 0, bottom: 0, left: 0, height: sand, backgroundColor: pixel.sand, borderTopWidth: border, borderColor: pixel.ink }} />
      <View style={{ position: 'absolute', right: 0, bottom: sand - scale(8), left: 0, alignItems: 'center' }}>{children}</View>
    </View>
  );
}

/** 이름 추천 칩. 선택은 색과 함께 글자 색·상태로도 알린다 */
export function GuideChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { scale } = useResponsive();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: scale(44),
        minWidth: scale(44),
        paddingHorizontal: scale(14),
        backgroundColor: selected ? pixel.tangerine : pressed ? pixel.sand : pixel.white,
        borderWidth: scale(2),
        borderColor: pixel.ink,
        alignItems: 'center',
        justifyContent: 'center',
      })}>
      <PixelText size={14} color={selected ? pixel.white : pixel.ink}>
        {label}
      </PixelText>
    </Pressable>
  );
}

/** 말풍선 꼬리. 테두리 두께와 같은 단으로 줄어드는 계단식 */
function GuideTail({ inset }: { inset?: number }) {
  const { scale } = useResponsive();
  const unit = scale(pixel.border);
  const inner = [10, 8, 6, 4, 2];
  // inset 이 있으면 카드 오른쪽 끝에서 그만큼 떨어진 곳을 가리킨다(꼬리 폭 12단의 절반을 빼서 가운데를 맞춘다)
  const placement =
    inset === undefined
      ? ({ alignSelf: 'center' } as const)
      : ({ alignSelf: 'flex-end', marginRight: Math.max(unit, inset - unit * 6) } as const);
  return (
    <View pointerEvents="none" style={{ ...placement, alignItems: 'center', marginTop: -unit }}>
      {inner.map((steps) => (
        <View key={steps} style={{ width: steps * unit + unit * 2, height: unit, backgroundColor: pixel.ink, alignItems: 'center' }}>
          <View style={{ width: steps * unit, height: unit, backgroundColor: pixel.panel }} />
        </View>
      ))}
      <View style={{ width: unit * 4, height: unit, backgroundColor: pixel.ink }} />
    </View>
  );
}

/** 섬을 가리키는 안내 카드. 아래 꼬리가 가리키는 곳이 구멍 */
export function GuideSpeech({
  children,
  tailInset,
  compact = false,
  tail = true,
}: {
  children: ReactNode;
  tailInset?: number;
  compact?: boolean;
  /** false 면 꼬리 없이 카드만 그린다(가리킬 곳이 없을 때) */
  tail?: boolean;
}) {
  const { scale } = useResponsive();
  return (
    <View>
      {/* compact: 섬을 덜 가리도록 안쪽 여백을 줄인 카드 */}
      <PixelPanel style={{ padding: scale(compact ? 14 : 18), gap: scale(compact ? 10 : 14) }}>{children}</PixelPanel>
      {tail ? <GuideTail inset={tailInset} /> : null}
    </View>
  );
}

/** 왼쪽은 물러나는 선택, 오른쪽은 주 선택 */
export function GuideChoices({
  left,
  right,
  onLeft,
  onRight,
  large = true,
}: {
  left: string;
  right: string;
  onLeft: () => void;
  onRight: () => void;
  /** false 면 작은 카드에 맞춰 버튼 높이를 줄인다 */
  large?: boolean;
}) {
  const { scale } = useResponsive();
  return (
    <View style={{ flexDirection: 'row', gap: scale(10) }}>
      <View style={{ flex: 1 }}>
        <PixelButton large={large} tone="ghost" label={left} onPress={onLeft} />
      </View>
      <View style={{ flex: 1 }}>
        <PixelButton large={large} label={right} onPress={onRight} />
      </View>
    </View>
  );
}
