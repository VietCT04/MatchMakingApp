import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SportFormat } from '@sports-matchmaking/shared';
import { useAuth } from '../src/auth/AuthContext';
import { apiClient } from '../src/lib/api';
import { useSports } from '../src/hooks/useSports';
import { useVenues } from '../src/hooks/useVenues';

export default function CreateMatchScreen() {
  const { user, authLoading } = useAuth();
  const { data: sports, loading: sportsLoading, error: sportsError, refresh: refreshSports } = useSports();
  const { data: venues, loading: venuesLoading, error: venuesError, refresh: refreshVenues } = useVenues();
  const [sportId, setSportId] = useState<string | undefined>();
  const [venueId, setVenueId] = useState<string | undefined>();
  const [format, setFormat] = useState<SportFormat>(SportFormat.DOUBLES);
  const [title, setTitle] = useState('Saturday Doubles');
  const [description, setDescription] = useState('Friendly MVP test match');
  const [startsAt, setStartsAt] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString());
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [minRating, setMinRating] = useState('1000');
  const [maxRating, setMaxRating] = useState('1500');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loading = sportsLoading || venuesLoading;
  const optionsError = sportsError || venuesError;
  const error = submitError || optionsError;

  async function handleCreate() {
    setSubmitError('');
    if (!user) {
      setSubmitError('Login required to create a match.');
      return;
    }
    const effectiveSportId = sportId ?? sports[0]?.id;
    const effectiveVenueId = venueId ?? venues[0]?.id;
    const parsedMaxPlayers = Number(maxPlayers);
    const parsedMinRating = minRating === '' ? undefined : Number(minRating);
    const parsedMaxRating = maxRating === '' ? undefined : Number(maxRating);

    if (!effectiveSportId || !effectiveVenueId || !title.trim()) {
      setSubmitError('Sport, venue, and title are required.');
      return;
    }
    if (!Number.isInteger(parsedMaxPlayers) || parsedMaxPlayers <= 0) {
      setSubmitError('Max players must be a positive whole number.');
      return;
    }
    if (Number.isNaN(Date.parse(startsAt))) {
      setSubmitError('Start time must be a valid ISO date string.');
      return;
    }
    if (parsedMinRating !== undefined && parsedMaxRating !== undefined && parsedMinRating > parsedMaxRating) {
      setSubmitError('Minimum rating must be less than or equal to maximum rating.');
      return;
    }

    setSubmitting(true);
    try {
      const match = await apiClient.createMatch({
        sportId: effectiveSportId,
        venueId: effectiveVenueId,
        title: title.trim(),
        description: description.trim() || undefined,
        format,
        startsAt,
        maxPlayers: parsedMaxPlayers,
        minRating: parsedMinRating,
        maxRating: parsedMaxRating,
      });
      router.replace({ pathname: '/match/[id]', params: { id: match.id } });
    } catch (createError) {
      setSubmitError(createError instanceof Error ? createError.message : 'Could not create match.');
    } finally {
      setSubmitting(false);
    }
  }

  async function retryLoad() {
    await Promise.all([refreshSports(), refreshVenues()]);
  }

  const selectedSportId = useMemo(() => sportId ?? sports[0]?.id, [sportId, sports]);
  const selectedVenueId = useMemo(() => venueId ?? venues[0]?.id, [venueId, venues]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Match</Text>
      {!authLoading && !user ? <Text style={styles.error}>Login required to create a match.</Text> : null}
      {loading ? <Text style={styles.muted}>Loading sports and venues...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && optionsError ? (
        <Pressable style={styles.secondaryButton} onPress={retryLoad}>
          <Text style={styles.secondaryButtonText}>Retry loading options</Text>
        </Pressable>
      ) : null}

      <Text style={styles.label}>Sport</Text>
      <View style={styles.optionRow}>
        {sports.map((sport) => (
          <Pressable key={sport.id} style={[styles.option, selectedSportId === sport.id && styles.optionActive]} onPress={() => setSportId(sport.id)}>
            <Text style={[styles.optionText, selectedSportId === sport.id && styles.optionTextActive]}>{sport.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Venue</Text>
      <View style={styles.optionColumn}>
        {venues.map((venue) => (
          <Pressable key={venue.id} style={[styles.option, selectedVenueId === venue.id && styles.optionActive]} onPress={() => setVenueId(venue.id)}>
            <Text style={[styles.optionText, selectedVenueId === venue.id && styles.optionTextActive]}>{venue.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Format</Text>
      <View style={styles.optionRow}>
        {[SportFormat.SINGLES, SportFormat.DOUBLES].map((item) => (
          <Pressable key={item} style={[styles.option, format === item && styles.optionActive]} onPress={() => setFormat(item)}>
            <Text style={[styles.optionText, format === item && styles.optionTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" />
      <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Description" />
      <TextInput style={styles.input} value={startsAt} onChangeText={setStartsAt} placeholder="startsAt ISO date" autoCapitalize="none" />
      <TextInput style={styles.input} value={maxPlayers} onChangeText={setMaxPlayers} placeholder="Max players" keyboardType="number-pad" />
      <TextInput style={styles.input} value={minRating} onChangeText={setMinRating} placeholder="Min rating" keyboardType="number-pad" />
      <TextInput style={styles.input} value={maxRating} onChangeText={setMaxRating} placeholder="Max rating" keyboardType="number-pad" />

      <Pressable
        style={[styles.button, (submitting || !user || loading) && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={submitting || !user || loading}
      >
        <Text style={styles.buttonText}>{submitting ? 'Creating...' : 'Create Match'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '700' },
  label: { fontWeight: '700', color: '#20304a' },
  input: { borderWidth: 1, borderColor: '#d0d7e2', borderRadius: 8, padding: 12 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionColumn: { gap: 8 },
  option: { borderWidth: 1, borderColor: '#cfd7e6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  optionActive: { backgroundColor: '#20304a', borderColor: '#20304a' },
  optionText: { color: '#20304a', textTransform: 'capitalize' },
  optionTextActive: { color: '#fff' },
  button: { backgroundColor: '#1f4ad3', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderColor: '#1f4ad3', borderWidth: 1, borderRadius: 8, padding: 12, alignSelf: 'flex-start' },
  secondaryButtonText: { color: '#1f4ad3', fontWeight: '700' },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
});
