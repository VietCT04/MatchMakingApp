import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RatingDto, RatingHistoryDto } from '@sports-matchmaking/shared';
import { DEMO_USER_ID } from '../src/config/demoUser';
import { apiClient } from '../src/lib/api';

export default function RatingsScreen() {
  const [ratings, setRatings] = useState<RatingDto[]>([]);
  const [history, setHistory] = useState<RatingHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRatings() {
      setLoading(true);
      setError('');
      try {
        const [ratingsResponse, historyResponse] = await Promise.all([
          apiClient.getUserRatings(DEMO_USER_ID),
          apiClient.getUserRatingHistory(DEMO_USER_ID),
        ]);
        setRatings(ratingsResponse);
        setHistory(historyResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load ratings.');
      } finally {
        setLoading(false);
      }
    }

    loadRatings();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ratings</Text>
      {loading ? <Text style={styles.muted}>Loading ratings...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.heading}>Current</Text>
      {!loading && !error && ratings.length === 0 ? <Text style={styles.muted}>No ratings yet.</Text> : null}
      {ratings.map((rating) => (
        <View key={rating.id} style={styles.card}>
          <Text style={styles.cardTitle}>{rating.sportId} | {rating.format}</Text>
          <Text style={styles.line}>Rating {rating.rating}</Text>
          <Text style={styles.line}>Games {rating.gamesPlayed} | Uncertainty {rating.uncertainty}</Text>
        </View>
      ))}

      <Text style={styles.heading}>History</Text>
      {!loading && !error && history.length === 0 ? <Text style={styles.muted}>No rating history yet.</Text> : null}
      {history.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.oldRating} -> {item.newRating} ({item.delta >= 0 ? '+' : ''}{item.delta})</Text>
          <Text style={styles.line}>Match {item.matchId}</Text>
          <Text style={styles.line}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  card: { borderWidth: 1, borderColor: '#d4dbe8', borderRadius: 8, padding: 12, gap: 4 },
  cardTitle: { fontWeight: '700' },
  line: { color: '#44516a' },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
});
