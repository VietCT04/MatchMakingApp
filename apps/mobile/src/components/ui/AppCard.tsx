import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from './tokens';

type AppCardProps = PropsWithChildren<{
  onPress?: () => void;
}>;

export function AppCard({ children, onPress }: AppCardProps) {
  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  pressed: {
    opacity: 0.9,
  },
});
