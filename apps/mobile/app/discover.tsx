import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MatchWithDetailsDto, SportDto } from '@sports-matchmaking/shared';
import { apiClient } from '../src/lib/api';

export default function DiscoverScreen() {
  const [matches, setMatches] = useState<MatchWithDetailsDto[]>([]);
  const [sports, setSports] = useState<SportDto[]>([]);
  const [selectedSportId, setSelectedSportId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadMatches(sportId = selectedSportId) {
    setLoading(true);
    setError('');
    try {
      const [sportsResponse, matchesResponse] = await Promise.all([
        apiClient.getSports(),
        apiClient.getMatches({ status: 'OPEN', sportId }),
      ]);
      setSports(sportsResponse);
      setMatches(matchesResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load matches.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  const sportOptions = useMemo(() => [{ id: undefined, name: 'All' }, ...sports], [sports]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Open Matches</Text>

      <View style={styles.filterRow}>
        {sportOptions.map((sport) => (
          <Pressable
            key={sport.id ?? 'all'}
            style={[styles.filter, selectedSportId === sport.id && styles.filterActive]}
            onPress={() => {
              setSelectedSportId(sport.id);
              loadMatches(sport.id);
            }}
          >
            <Text style={[styles.filterText, selectedSportId === sport.id && styles.filterTextActive]}>
              {sport.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? <Text style={styles.muted}>Loading matches...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && matches.length === 0 ? <Text style={styles.muted}>No open matches found.</Text> : null}

      {matches.map((match) => {
        const players = match.participants?.filter((item) => item.status === 'JOINED').length ?? 0;
        return (
          <Pressable
            key={match.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/match/[id]', params: { id: match.id } })}
          >
            <Text style={styles.cardTitle}>{match.title}</Text>
            <Text style={styles.line}>{match.sport?.name ?? match.sportId} at {match.venue?.name ?? 'Venue TBD'}</Text>
            <Text style={styles.line}>{new Date(match.startsAt).toLocaleString()}</Text>
            <Text style={styles.line}>{match.format} | {players}/{match.maxPlayers} players | {match.status}</Text>
            <Text style={styles.line}>Rating {match.minRating ?? 'any'}-{match.maxRating ?? 'any'}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { borderWidth: 1, borderColor: '#cfd7e6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  filterActive: { backgroundColor: '#20304a', borderColor: '#20304a' },
  filterText: { color: '#20304a', textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderColor: '#d0d8e6', borderRadius: 8, borderWidth: 1, padding: 14, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  line: { color: '#44516a' },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
});
