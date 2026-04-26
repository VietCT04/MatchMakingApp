import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './ui/tokens';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  textWrap: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
  },
  subtitle: {
    color: colors.muted,
  },
});
