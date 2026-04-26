import { MatchParticipantDto, MatchParticipantStatus } from '@sports-matchmaking/shared';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { AppInput } from '../ui/AppInput';
import { Badge } from '../ui/Badge';
import { colors } from '../ui/tokens';

type TrustSafetyPanelProps = {
  participants: MatchParticipantDto[];
  currentUserId?: string;
  reportReason: string;
  onReportReasonChange: (value: string) => void;
  onReportUser: (participant: MatchParticipantDto) => void;
  canMarkNoShow: boolean;
  canMarkNoShowFor: (participant: MatchParticipantDto) => boolean;
  onMarkNoShow: (participant: MatchParticipantDto) => void;
  canDisputeResult: boolean;
  hasDisputed: boolean;
  onDisputeResult: () => void;
  busy: boolean;
};

function toParticipantName(participant: MatchParticipantDto, fallbackIndex: number): string {
  return participant.displayName?.trim() || `Player ${fallbackIndex + 1}`;
}

export function TrustSafetyPanel({
  participants,
  currentUserId,
  reportReason,
  onReportReasonChange,
  onReportUser,
  canMarkNoShow,
  canMarkNoShowFor,
  onMarkNoShow,
  canDisputeResult,
  hasDisputed,
  onDisputeResult,
  busy,
}: TrustSafetyPanelProps) {
  const otherParticipants = participants.filter((participant) => participant.userId !== currentUserId);

  return (
    <AppCard>
      <Text style={styles.title}>Trust & safety</Text>
      <Text style={styles.helper}>
        Report players, mark no-show where allowed, and raise disputes for incorrect results.
      </Text>

      <AppInput
        label="Report reason"
        value={reportReason}
        onChangeText={onReportReasonChange}
        placeholder="Reason for report"
        helperText="This reason is used when you tap report on a participant."
      />

      {otherParticipants.length === 0 ? <Text style={styles.helper}>No other participants to report.</Text> : null}

      {otherParticipants.map((participant, index) => (
        <View key={participant.id} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.name}>{toParticipantName(participant, index)}</Text>
            <View style={styles.badges}>
              <Badge>{participant.team === 'UNKNOWN' ? 'Team unknown' : `Team ${participant.team}`}</Badge>
              <Badge tone={participant.status === MatchParticipantStatus.JOINED ? 'success' : 'info'}>
                {participant.status === MatchParticipantStatus.NO_SHOW ? 'No-show' : participant.status}
              </Badge>
            </View>
          </View>
          <View style={styles.actions}>
            <AppButton variant="secondary" disabled={busy} onPress={() => onReportUser(participant)}>
              Report player
            </AppButton>
            {canMarkNoShow && canMarkNoShowFor(participant) ? (
              <AppButton variant="secondary" disabled={busy} onPress={() => onMarkNoShow(participant)}>
                Mark no-show
              </AppButton>
            ) : null}
          </View>
        </View>
      ))}

      {canDisputeResult ? (
        <AppButton variant="secondary" disabled={busy || hasDisputed} onPress={onDisputeResult}>
          {hasDisputed ? 'Dispute already submitted' : 'Dispute result'}
        </AppButton>
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
  helper: {
    color: colors.muted,
  },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  rowText: {
    gap: 6,
  },
  name: {
    color: colors.ink,
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actions: {
    gap: 8,
  },
});
