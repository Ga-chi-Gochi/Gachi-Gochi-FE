import { TextInput, type TextInputProps } from 'react-native';

import { gachiUi } from '@/constants/gachi-ui';
import { useResponsive } from '@/hooks/use-responsive';

type GachiTextFieldProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'onFocus'
  | 'onBlur'
  | 'placeholder'
  | 'editable'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'accessibilityLabel'
>;

/** 로그인과 같은 크림톤 입력창. Galmuri9 + gachiUi 테두리 */
export function GachiTextField({
  value,
  onChangeText,
  onFocus,
  onBlur,
  placeholder,
  editable = true,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  accessibilityLabel,
}: GachiTextFieldProps) {
  const { scale } = useResponsive();
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel ?? placeholder}
      value={value}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor={gachiUi.inkSoft}
      editable={editable}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      style={{
        alignSelf: 'stretch',
        minHeight: scale(48),
        backgroundColor: gachiUi.white,
        borderWidth: scale(gachiUi.border),
        borderColor: gachiUi.ink,
        borderRadius: scale(8),
        paddingHorizontal: scale(14),
        color: gachiUi.ink,
        fontFamily: 'Galmuri9',
        fontSize: scale(10),
      }}
    />
  );
}
