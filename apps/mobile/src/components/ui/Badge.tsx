import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type BadgeProps = PropsWithChildren<{
  tone?: 'default' | 'info' | 'success';
}>;

export function Badge({ children, tone = 'default' }: BadgeProps) {
  return (
    <View style={[styles.base, tone === 'info' ? styles.info : null, tone === 'success' ? styles.success : null]}>
      <Text style={[styles.text, tone === 'info' ? styles.infoText : null, tone === 'success' ? styles.successText : null]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#e7ecf7',
  },
  info: {
    backgroundColor: '#e9efff',
  },
  success: {
    backgroundColor: '#e7f6ed',
  },
  text: {
    fontWeight: '700',
    color: '#20304a',
  },
  infoText: {
    color: '#1f4ad3',
  },
  successText: {
    color: '#067647',
  },
});
