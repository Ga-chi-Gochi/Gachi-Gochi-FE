import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useResponsive } from '@/hooks/use-responsive';

export default function ModalScreen() {
  const { scale } = useResponsive();

  return (
    <ThemedView style={[styles.container, { padding: scale(20) }]}>
      <ThemedText type="title">This is a modal</ThemedText>
      <Link
        href="/"
        dismissTo
        style={{ marginTop: scale(15), paddingVertical: scale(15) }}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
