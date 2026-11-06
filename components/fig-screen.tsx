import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FigScreenProps = {
  colors: readonly [string, string, ...string[]];
  children: ReactNode;
};

export function FigScreen({ colors, children }: FigScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors[0] }}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
    </View>
  );
}
