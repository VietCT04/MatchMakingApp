import { MatchParticipantDto, MatchParticipantStatus } from '@sports-matchmaking/shared';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../ui/Badge';
import { colors } from '../ui/tokens';

type ParticipantRowProps = {
  participant: MatchParticipantDto;
  fallbackName: string;
  isCurrentUser: boolean;
};

function toStatusLabel(status: MatchParticipantStatus): string {
  if (status === MatchParticipantStatus.LEFT) {
    return 'Left';
  }
  if (status === MatchParticipantStatus.NO_SHOW) {
    return 'No-show';
  }
  return 'Joined';
}

function toStatusTone(status: MatchParticipantStatus): 'default' | 'info' | 'success' {
  if (status === MatchParticipantStatus.JOINED) {
    return 'success';
  }
  if (status === MatchParticipantStatus.NO_SHOW) {
    return 'info';
  }
  return 'default';
}

export function ParticipantRow({ participant, fallbackName, isCurrentUser }: ParticipantRowProps) {
  const displayName = participant.displayName?.trim() || fallbackName;

  return (
    <View style={styles.row}>
      <View style={styles.textWrap}>
        <Text style={styles.name}>{displayName}</Text>
        <View style={styles.badgeRow}>
          {isCurrentUser ? <Badge tone="info">You</Badge> : null}
          {typeof participant.reliabilityScore === 'number' ? (
            <Badge>{Math.round(participant.reliabilityScore)} reliability</Badge>
          ) : null}
          <Badge tone={toStatusTone(participant.status)}>{toStatusLabel(participant.status)}</Badge>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  textWrap: {
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
