import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../ui/AppButton';

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.error}>{message}</Text>
      {onRetry ? <AppButton variant="secondary" onPress={onRetry}>Retry</AppButton> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  error: {
    color: '#b42318',
  },
});
