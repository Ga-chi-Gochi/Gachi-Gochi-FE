import { useCallback, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';

type PixelAlignedProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function PixelAligned({ children, style }: PixelAlignedProps) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [shift, setShift] = useState({ x: 0, y: 0 });

  const align = useCallback(() => {
    ref.current?.measureInWindow((x, y) => {
      const ratio = PixelRatio.get();
      const baseX = x - shift.x;
      const baseY = y - shift.y;
      const next = { x: Math.round(baseX * ratio) / ratio - baseX, y: Math.round(baseY * ratio) / ratio - baseY };
      if (Math.abs(next.x - shift.x) > 0.001 || Math.abs(next.y - shift.y) > 0.001) {
        setShift(next);
      }
    });
  }, [shift.x, shift.y]);

  return (
    <View ref={ref} collapsable={false} onLayout={align} style={[style, { transform: [{ translateX: shift.x }, { translateY: shift.y }] }]}>
      {children}
    </View>
  );
}
