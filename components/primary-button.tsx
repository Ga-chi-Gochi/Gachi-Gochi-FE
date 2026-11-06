import { Pressable, Text } from 'react-native';

import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, disabled = false }: PrimaryButtonProps) {
  const { scale } = useResponsive();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: disabled ? palette.line : palette.tangerine,
        borderRadius: scale(16),
        paddingVertical: scale(16),
        alignItems: 'center',
      }}>
      <Text style={{ color: disabled ? palette.muted : '#fff', fontSize: scale(16), fontWeight: '800' }}>
        {label}
      </Text>
    </Pressable>
  );
}
