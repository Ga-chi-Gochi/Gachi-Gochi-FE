import { useCallback, useState } from 'react';
import { Pressable } from 'react-native';

import { PixelText } from '@/components/pixel/pixel-ui';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export function useStoreModeToggle() {
  const [active, setActive] = useState(false);
  const toggle = useCallback(() => setActive((current) => !current), []);
  const reset = useCallback(() => setActive(false), []);
  return { active, toggle, reset };
}

export function StoreModeToggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { scale } = useResponsive();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        paddingHorizontal: scale(10),
        paddingVertical: scale(6),
        borderWidth: scale(2),
        borderColor: pixel.ink,
        backgroundColor: active ? pixel.tangerine : pixel.white,
        transform: [{ translateY: active ? scale(2) : 0 }],
      }}>
      <PixelText size={11} color={active ? pixel.white : pixel.ink}>
        {active ? `${label} ON` : label}
      </PixelText>
    </Pressable>
  );
}
