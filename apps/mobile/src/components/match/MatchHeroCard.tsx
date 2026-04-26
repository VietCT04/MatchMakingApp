import { MatchParticipantDto, MatchStatus, MatchWithDetailsDto } from '@sports-matchmaking/shared';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../ui/AppCard';
import { Badge } from '../ui/Badge';
import { colors } from '../ui/tokens';

type MatchHeroCardProps = {
  match: MatchWithDetailsDto;
  joinedCount: number;
  currentParticipant?: MatchParticipantDto;
  averageReliabilityScore?: number;
};

function toStatusTone(status: MatchStatus): 'default' | 'info' | 'success' {
  if (status === MatchStatus.COMPLETED) {
    return 'success';
  }
  if (status === MatchStatus.CANCELLED) {
    return 'info';
  }
  return 'default';
}

function toRatingRange(minRating: number | null, maxRating: number | null): string {
  if (minRating === null && maxRating === null) {
    return 'Any rating';
  }
  if (minRating !== null && maxRating !== null) {
    return `${minRating} - ${maxRating}`;
  }
  if (minRating !== null) {
    return `${minRating}+`;
  }
  return `Up to ${maxRating}`;
}

export function MatchHeroCard({
  match,
  joinedCount,
  currentParticipant,
  averageReliabilityScore,
}: MatchHeroCardProps) {
  return (
    <AppCard>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{match.title}</Text>
        <Badge tone={toStatusTone(match.status)}>{match.status}</Badge>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.label}>Sport</Text>
        <Text style={styles.value}>{match.sport?.name ?? 'Unknown sport'}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Format</Text>
        <Text style={styles.value}>{match.format}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Venue</Text>
        <Text style={styles.value}>{match.venue?.name ?? 'Venue TBD'}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Date & time</Text>
        <Text style={styles.value}>{new Date(match.startsAt).toLocaleString()}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Rating range</Text>
        <Text style={styles.value}>{toRatingRange(match.minRating, match.maxRating)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Participants</Text>
        <Text style={styles.value}>
          {joinedCount}/{match.maxPlayers}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.label}>Your state</Text>
        <Text style={styles.value}>
          {currentParticipant ? `Joined Team ${currentParticipant.team}` : 'Not joined'}
        </Text>
      </View>

      <View style={styles.badgeRow}>
        {typeof match.fitScore === 'number' ? <Badge tone="info">{Math.round(match.fitScore)}% fit</Badge> : null}
        {typeof match.distanceKm === 'number' ? <Badge tone="success">{match.distanceKm.toFixed(1)} km away</Badge> : null}
        {typeof averageReliabilityScore === 'number' ? (
          <Badge>{Math.round(averageReliabilityScore)} reliability</Badge>
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
  },
  value: {
    flex: 1,
    textAlign: 'right',
    color: colors.ink,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
});
