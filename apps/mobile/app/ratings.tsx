import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthContext';
import { useUserRatings } from '../src/hooks/useUserRatings';
import { Pressable } from 'react-native';

export default function RatingsScreen() {
  const { user, authLoading } = useAuth();
  const { data, loading, error, refresh } = useUserRatings(Boolean(user));
  const { ratings, history } = data;

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void refresh();
      }
    }, [refresh, user]),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ratings</Text>
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
          <Text style={styles.cardTitle}>
            {item.oldRating}
            {' -> '}
            {item.newRating} ({item.delta >= 0 ? '+' : ''}
            {item.delta})
          </Text>
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
  messageBox: { gap: 8 },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
  retryButton: {
    alignSelf: 'flex-start',
    borderColor: '#1f4ad3',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryText: { color: '#1f4ad3', fontWeight: '700' },
});
