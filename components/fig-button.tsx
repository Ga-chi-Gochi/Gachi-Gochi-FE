import { Pressable, Text } from 'react-native';

import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

type FigButtonProps = {
  label: string;
  onPress: () => void;
  tone?: 'orange' | 'green' | 'white';
};

export function FigButton({ label, onPress, tone = 'orange' }: FigButtonProps) {
  const { scale } = useResponsive();
  const backgroundColor = tone === 'green' ? palette.leaf : tone === 'white' ? palette.white : palette.tangerine;
  const color = tone === 'white' ? palette.ink : palette.white;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: scale(58),
        borderRadius: scale(20),
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(12),
        borderWidth: tone === 'white' ? 1 : 0,
        borderColor: palette.line,
      }}>
      <Text style={{ color, fontSize: scale(16), fontWeight: '800', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}
