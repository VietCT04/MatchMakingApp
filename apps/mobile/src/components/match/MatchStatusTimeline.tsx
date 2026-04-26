import { MatchStatus } from '@sports-matchmaking/shared';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../ui/AppCard';
import { Badge } from '../ui/Badge';
import { colors } from '../ui/tokens';

type MatchStatusTimelineProps = {
  status: MatchStatus;
  hasResult: boolean;
  isResultVerified: boolean;
};

type Stage = {
  label: string;
  active: boolean;
};

export function MatchStatusTimeline({ status, hasResult, isResultVerified }: MatchStatusTimelineProps) {
  if (status === MatchStatus.CANCELLED) {
    return (
      <AppCard>
        <Text style={styles.title}>Match status</Text>
        <Badge tone="info">CANCELLED</Badge>
        <Text style={styles.note}>This match was cancelled and cannot continue to result verification.</Text>
      </AppCard>
    );
  }

  const stages: Stage[] = [
    { label: 'OPEN', active: true },
    { label: 'FULL', active: status === MatchStatus.FULL || status === MatchStatus.COMPLETED || hasResult },
    { label: 'RESULT SUBMITTED', active: hasResult },
    { label: 'VERIFIED / COMPLETED', active: isResultVerified || status === MatchStatus.COMPLETED },
  ];

  return (
    <AppCard>
      <Text style={styles.title}>Match progress</Text>
      <View style={styles.row}>
        {stages.map((stage, index) => (
          <View key={stage.label} style={styles.stageWrap}>
            <View style={[styles.dot, stage.active ? styles.dotActive : null]} />
            <Text style={[styles.stageText, stage.active ? styles.stageTextActive : null]}>{stage.label}</Text>
            {index < stages.length - 1 ? <View style={[styles.line, stage.active ? styles.lineActive : null]} /> : null}
          </View>
        ))}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  note: {
    color: colors.muted,
  },
  row: {
    gap: 12,
  },
  stageWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#cdd8ea',
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#dce5f3',
  },
  lineActive: {
    backgroundColor: '#8fa7e8',
  },
  stageText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 120,
  },
  stageTextActive: {
    color: colors.ink,
  },
});
