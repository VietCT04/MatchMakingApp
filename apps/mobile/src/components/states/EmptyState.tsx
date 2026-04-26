import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../ui/AppButton';

type EmptyStateProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? <AppButton variant="secondary" onPress={onAction}>{actionLabel}</AppButton> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  title: {
    fontWeight: '700',
    color: '#20304a',
  },
  message: {
    color: '#6f7b91',
  },
});
