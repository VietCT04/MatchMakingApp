import { Pressable, StyleSheet, Text } from 'react-native';

type ChipProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export function Chip({ label, active = false, disabled = false, onPress }: ChipProps) {
  return (
    <Pressable
      style={[styles.base, active ? styles.active : null, disabled ? styles.disabled : null]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.text, active ? styles.activeText : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: '#cfd7e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  active: {
    backgroundColor: '#20304a',
    borderColor: '#20304a',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#20304a',
    fontWeight: '600',
  },
  activeText: {
    color: '#ffffff',
  },
});
