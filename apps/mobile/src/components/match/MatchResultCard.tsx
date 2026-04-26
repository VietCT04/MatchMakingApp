import { MatchResultDto } from '@sports-matchmaking/shared';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { AppInput } from '../ui/AppInput';
import { Badge } from '../ui/Badge';
import { colors } from '../ui/tokens';

type MatchResultCardProps = {
  result: MatchResultDto | null;
  canSubmitResult: boolean;
  canVerifyResult: boolean;
  canDisputeResult: boolean;
  hasDisputed: boolean;
  teamAScore: string;
  teamBScore: string;
  disputeReason: string;
  onTeamAScoreChange: (value: string) => void;
  onTeamBScoreChange: (value: string) => void;
  onDisputeReasonChange: (value: string) => void;
  onSubmitResult: () => void;
  onVerifyResult: () => void;
  onDisputeResult: () => void;
  busy: boolean;
  submittedByName?: string;
};

export function MatchResultCard({
  result,
  canSubmitResult,
  canVerifyResult,
  canDisputeResult,
  hasDisputed,
  teamAScore,
  teamBScore,
  disputeReason,
  onTeamAScoreChange,
  onTeamBScoreChange,
  onDisputeReasonChange,
  onSubmitResult,
  onVerifyResult,
  onDisputeResult,
  busy,
  submittedByName,
}: MatchResultCardProps) {
  return (
    <AppCard>
      <Text style={styles.title}>Result workflow</Text>

      {!result ? (
        <>
          <Badge>No result yet</Badge>
          {canSubmitResult ? (
            <>
              <View style={styles.scoreRow}>
                <AppInput
                  style={styles.halfInput}
                  label="Team A score"
                  value={teamAScore}
                  onChangeText={onTeamAScoreChange}
                  keyboardType="number-pad"
                />
                <AppInput
                  style={styles.halfInput}
                  label="Team B score"
                  value={teamBScore}
                  onChangeText={onTeamBScoreChange}
                  keyboardType="number-pad"
                />
              </View>
              <AppButton disabled={busy} onPress={onSubmitResult}>
                Submit result
              </AppButton>
            </>
          ) : (
            <Text style={styles.helper}>Only joined participants can submit a result.</Text>
          )}
        </>
      ) : (
        <>
          <View style={styles.scoreSummary}>
            <Text style={styles.scoreLine}>Team A: {result.teamAScore}</Text>
            <Text style={styles.scoreLine}>Team B: {result.teamBScore}</Text>
          </View>
          {submittedByName ? <Text style={styles.meta}>Submitted by: {submittedByName}</Text> : null}
          {result.verified ? (
            <>
              <Badge tone="success">Verified</Badge>
              <Text style={styles.verifiedText}>Result verified. Match is completed.</Text>
            </>
          ) : (
            <>
              <Badge tone="info">Pending verification</Badge>
              <Text style={styles.helper}>Result submitted. Waiting for another participant to verify.</Text>
            </>
          )}
          {hasDisputed ? <Badge tone="info">Disputed</Badge> : null}

          {canVerifyResult ? (
            <AppButton variant="secondary" disabled={busy} onPress={onVerifyResult}>
              Verify result
            </AppButton>
          ) : null}

          {canDisputeResult ? (
            <>
              <AppInput
                label="Dispute reason"
                value={disputeReason}
                onChangeText={onDisputeReasonChange}
                placeholder="Explain why this score is incorrect"
              />
              <AppButton variant="secondary" disabled={busy || hasDisputed} onPress={onDisputeResult}>
                {hasDisputed ? 'Dispute already submitted' : 'Dispute result'}
              </AppButton>
            </>
          ) : null}
        </>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  helper: {
    color: colors.muted,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  scoreSummary: {
    gap: 4,
  },
  scoreLine: {
    color: colors.ink,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  verifiedText: {
    color: colors.success,
    fontWeight: '600',
  },
});
