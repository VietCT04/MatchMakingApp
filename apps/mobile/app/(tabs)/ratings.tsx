import { useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SportFormat } from '@sports-matchmaking/shared';
import { useAuth } from '../../src/auth/AuthContext';
import { useUserRatings } from '../../src/hooks/useUserRatings';
import { useSports } from '../../src/hooks/useSports';

type RatingHistoryWithMatch = {
  id: string;
  oldRating: number;
  newRating: number;
  delta: number;
  createdAt: string;
  matchId: string;
  match?: { title?: string } | null;
};

function formatSportFormatLabel(sportName: string, format: SportFormat) {
  return `${sportName} ${format === SportFormat.SINGLES ? 'Singles' : 'Doubles'}`;
}

export default function RatingsScreen() {
  const { user, authLoading } = useAuth();
  const { data, loading, error, refresh } = useUserRatings(Boolean(user));
  const { data: sports } = useSports();
  const { ratings, history } = data;

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void refresh();
      }
    }, [refresh, user]),
  );

  const sportNameById = useMemo(
    () => new Map(sports.map((sport) => [sport.id, sport.name])),
    [sports],
  );

  const groupedRatings = useMemo(() => {
    const groups = new Map<string, typeof ratings>();
    for (const rating of ratings) {
      const sportName = sportNameById.get(rating.sportId) ?? 'Unknown sport';
      const key = formatSportFormatLabel(sportName, rating.format);
      groups.set(key, [...(groups.get(key) ?? []), rating]);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [ratings, sportNameById]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ratings</Text>
      <Text style={styles.subtitle}>Track your current rating and how each verified match changed it.</Text>

      {!authLoading && !user ? <Text style={styles.error}>Login required to view ratings.</Text> : null}
      {loading ? <Text style={styles.muted}>Loading ratings...</Text> : null}
      {error ? (
        <View style={styles.messageBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.heading}>Current Ratings</Text>
      {!loading && !error && groupedRatings.length === 0 ? <Text style={styles.muted}>No ratings yet.</Text> : null}
      {groupedRatings.map(([groupLabel, group]) => (
        <View key={groupLabel} style={styles.card}>
          <Text style={styles.cardTitle}>{groupLabel}</Text>
          {group.map((rating) => (
            <View key={rating.id} style={styles.row}>
              <Text style={styles.rowLabel}>Current rating</Text>
              <Text style={styles.rowValue}>{rating.rating}</Text>
              <Text style={styles.rowLabel}>Games played</Text>
              <Text style={styles.rowValue}>{rating.gamesPlayed}</Text>
              <Text style={styles.rowLabel}>Uncertainty</Text>
              <Text style={styles.rowValue}>{rating.uncertainty}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.heading}>Rating History</Text>
      {!loading && !error && history.length === 0 ? <Text style={styles.muted}>No rating history yet.</Text> : null}
      {history.map((rawItem) => {
        const item = rawItem as unknown as RatingHistoryWithMatch;
        const matchTitle = item.match?.title ?? `Match ${item.matchId.slice(0, 8)}`;
        return (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{matchTitle}</Text>
            <Text style={styles.line}>
              {item.oldRating} {'->'} {item.newRating}
            </Text>
            <Text style={[styles.delta, item.delta >= 0 ? styles.deltaUp : styles.deltaDown]}>
              {item.delta >= 0 ? '+' : ''}{item.delta}
            </Text>
            <Text style={styles.line}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 20, gap: 12, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#17263b' },
  subtitle: { color: '#5f6d86' },
  heading: { fontSize: 18, fontWeight: '700', color: '#20304a', marginTop: 6 },
  card: {
    borderWidth: 1,
    borderColor: '#d4dbe8',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: '#fff',
  },
  cardTitle: { fontWeight: '700', color: '#20304a' },
  row: { gap: 2 },
  rowLabel: { color: '#66748e', fontSize: 12 },
  rowValue: { color: '#20304a', fontWeight: '700' },
  line: { color: '#44516a' },
  delta: { fontWeight: '700' },
  deltaUp: { color: '#067647' },
  deltaDown: { color: '#b42318' },
  messageBox: { gap: 8 },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
  retryButton: {
    alignSelf: 'flex-start',
    borderColor: '#1f4ad3',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryText: { color: '#1f4ad3', fontWeight: '700' },
});

