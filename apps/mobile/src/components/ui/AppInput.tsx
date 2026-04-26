import { TextInput, TextInputProps, StyleSheet, Text, View } from 'react-native';
import { colors } from './tokens';

type AppInputProps = TextInputProps & {
  label?: string;
  helperText?: string;
  error?: string;
};

export function AppInput({ label, helperText, error, style, ...props }: AppInputProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput style={[styles.input, error ? styles.inputError : null, style]} {...props} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontWeight: '600',
    color: '#20304a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c9d3e6',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#b42318',
  },
  helper: {
    color: '#66748e',
    fontSize: 12,
  },
  error: {
    color: '#b42318',
    fontSize: 12,
  },
});
