import { MatchStatus } from '@sports-matchmaking/shared';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { colors } from '../ui/tokens';

type MatchActionPanelProps = {
  status: MatchStatus;
  canJoin: boolean;
  canLeave: boolean;
  busy: boolean;
  onJoinTeamA: () => void;
  onJoinTeamB: () => void;
  onLeave: () => void;
  helperText?: string;
};

export function MatchActionPanel({
  status,
  canJoin,
  canLeave,
  busy,
  onJoinTeamA,
  onJoinTeamB,
  onLeave,
  helperText,
}: MatchActionPanelProps) {
  return (
    <AppCard>
      <Text style={styles.title}>Actions</Text>

      {status === MatchStatus.COMPLETED ? (
        <Text style={styles.completedText}>This match is completed. No further join/leave actions are available.</Text>
      ) : null}

      {canJoin ? (
        <View style={styles.buttonRow}>
          <AppButton disabled={busy} onPress={onJoinTeamA}>
            Join Team A
          </AppButton>
          <AppButton disabled={busy} onPress={onJoinTeamB}>
            Join Team B
          </AppButton>
        </View>
      ) : null}

      {canLeave ? (
        <AppButton variant="secondary" disabled={busy} onPress={onLeave}>
          Leave match
        </AppButton>
      ) : null}

      {!canJoin && !canLeave && status !== MatchStatus.COMPLETED ? (
        <Text style={styles.helper}>{helperText ?? 'No available actions right now for your current state.'}</Text>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  helper: {
    color: colors.muted,
  },
  completedText: {
    color: colors.success,
    fontWeight: '600',
  },
});
