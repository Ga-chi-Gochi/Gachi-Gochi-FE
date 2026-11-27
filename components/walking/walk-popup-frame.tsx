import { type ReactNode } from 'react';
import { View } from 'react-native';

import { walkColor } from '@/components/walking/walk-assets';
import { useResponsive } from '@/hooks/use-responsive';

type WalkPopupFrameProps = {
  children: ReactNode;
  width?: number;
  zIndex?: number;
  accent?: boolean;
  behind?: ReactNode;
};

export function WalkPopupFrame({ children, width = 300, zIndex = 60, accent = false, behind }: WalkPopupFrameProps) {
  const { scale, width: screenWidth } = useResponsive();
  const panelWidth = Math.min(scale(width), screenWidth - scale(48));

  return (
    <View
      accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: walkColor.dim, alignItems: 'center', justifyContent: 'center', zIndex }}>
      {behind}
      <View style={{ width: panelWidth, borderWidth: scale(2), borderColor: walkColor.black }}>
        <View style={{ borderWidth: scale(6), borderColor: walkColor.wood }}>
          <View style={{ borderWidth: scale(2), borderColor: walkColor.black }}>
            <View
              style={{
                borderWidth: accent ? scale(3) : 0,
                borderColor: walkColor.gold,
                backgroundColor: walkColor.panel,
                paddingHorizontal: scale(14),
                paddingTop: scale(14),
                paddingBottom: scale(12),
                alignItems: 'center',
                gap: scale(12),
              }}>
              {children}
            </View>
          </View>
        </View>
        {accent ? <CornerSparkles /> : null}
      </View>
    </View>
  );
}

function CornerSparkles() {
  const { scale } = useResponsive();
  const offset = -scale(7);
  const corners = [
    { left: offset, top: offset },
    { right: offset, top: offset },
    { left: offset, bottom: offset },
    { right: offset, bottom: offset },
  ];

  return (
    <>
      {corners.map((corner, index) => (
        <Sparkle key={index} style={corner} />
      ))}
    </>
  );
}

function Sparkle({ style }: { style: { left?: number; right?: number; top?: number; bottom?: number } }) {
  const { scale } = useResponsive();
  const dot = scale(3);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: dot * 5, height: dot * 5, ...style }}>
      <View style={{ position: 'absolute', left: dot * 2, top: 0, width: dot, height: dot * 5, backgroundColor: walkColor.gold }} />
      <View style={{ position: 'absolute', left: 0, top: dot * 2, width: dot * 5, height: dot, backgroundColor: walkColor.gold }} />
      <View style={{ position: 'absolute', left: dot * 2, top: dot * 2, width: dot, height: dot, backgroundColor: walkColor.white }} />
    </View>
  );
}
