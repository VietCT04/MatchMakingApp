import { MatchParticipantDto } from '@sports-matchmaking/shared';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../ui/AppCard';
import { colors } from '../ui/tokens';
import { ParticipantRow } from './ParticipantRow';

type TeamRosterCardProps = {
  title: string;
  participants: MatchParticipantDto[];
  currentUserId?: string;
  emptyMessage?: string;
};

export function TeamRosterCard({
  title,
  participants,
  currentUserId,
  emptyMessage = 'No participants yet.',
}: TeamRosterCardProps) {
  return (
    <AppCard>
      <Text style={styles.title}>{title}</Text>
      {participants.length === 0 ? <Text style={styles.empty}>{emptyMessage}</Text> : null}
      {participants.map((participant, index) => (
        <ParticipantRow
          key={participant.id}
          participant={participant}
          fallbackName={`Player ${index + 1}`}
          isCurrentUser={participant.userId === currentUserId}
        />
      ))}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  empty: {
    color: colors.muted,
  },
});
