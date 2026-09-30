import { useColorScheme as useReactNativeColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' | null {
  const colorScheme = useReactNativeColorScheme();

  if (colorScheme === 'dark' || colorScheme === 'light') {
    return colorScheme;
  }

  return null;
}
