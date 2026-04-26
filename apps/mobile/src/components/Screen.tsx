import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors } from './ui/tokens';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
}>;

export function Screen({ children, scroll = true, padded = true }: ScreenProps) {
  if (scroll) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, padded ? styles.padded : null]}>
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.container, padded ? styles.padded : null]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  padded: {
    padding: 20,
  },
});
