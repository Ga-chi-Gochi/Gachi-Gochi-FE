import { StyleSheet, Text, type TextProps } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const { scale } = useResponsive();
  const sized = {
    default: { fontSize: scale(16), lineHeight: scale(24) },
    defaultSemiBold: { fontSize: scale(16), lineHeight: scale(24) },
    title: { fontSize: scale(32), lineHeight: scale(32) },
    subtitle: { fontSize: scale(20) },
    link: { fontSize: scale(16), lineHeight: scale(30) },
  }[type];

  return (
    <Text
      style={[
        { color },
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        sized,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  defaultSemiBold: {
    fontWeight: '600',
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    fontWeight: 'bold',
  },
  link: {
    color: '#0a7ea4',
  },
});
