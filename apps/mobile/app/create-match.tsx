import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SportFormat, type SportDto, type VenueDto } from '@sports-matchmaking/shared';
import { DEMO_USER_ID } from '../src/config/demoUser';
import { apiClient } from '../src/lib/api';

export default function CreateMatchScreen() {
  const [sports, setSports] = useState<SportDto[]>([]);
  const [venues, setVenues] = useState<VenueDto[]>([]);
  const [sportId, setSportId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [format, setFormat] = useState<SportFormat>(SportFormat.DOUBLES);
  const [title, setTitle] = useState('Saturday Doubles');
  const [description, setDescription] = useState('Friendly MVP test match');
  const [startsAt, setStartsAt] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString());
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [minRating, setMinRating] = useState('1000');
  const [maxRating, setMaxRating] = useState('1500');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOptions() {
      try {
        const [sportsResponse, venuesResponse] = await Promise.all([apiClient.getSports(), apiClient.getVenues()]);
        setSports(sportsResponse);
        setVenues(venuesResponse);
        setSportId(sportsResponse[0]?.id ?? '');
        setVenueId(venuesResponse[0]?.id ?? '');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load form options.');
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, []);

  async function handleCreate() {
    setError('');
    const parsedMaxPlayers = Number(maxPlayers);
    const parsedMinRating = minRating === '' ? undefined : Number(minRating);
    const parsedMaxRating = maxRating === '' ? undefined : Number(maxRating);

    if (!sportId || !venueId || !title.trim()) {
      setError('Sport, venue, and title are required.');
      return;
    }
    if (!Number.isInteger(parsedMaxPlayers) || parsedMaxPlayers <= 0) {
      setError('Max players must be a positive whole number.');
      return;
    }
    if (Number.isNaN(Date.parse(startsAt))) {
      setError('Start time must be a valid ISO date string.');
      return;
    }
    if (parsedMinRating !== undefined && parsedMaxRating !== undefined && parsedMinRating > parsedMaxRating) {
      setError('Minimum rating must be less than or equal to maximum rating.');
      return;
    }

    setSubmitting(true);
    try {
      const match = await apiClient.createMatch({
        sportId,
        venueId,
        createdByUserId: DEMO_USER_ID,
        title: title.trim(),
        description: description.trim() || undefined,
        format,
        startsAt,
        maxPlayers: parsedMaxPlayers,
        minRating: parsedMinRating,
        maxRating: parsedMaxRating,
      });
      router.push({ pathname: '/match/[id]', params: { id: match.id } });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create match.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Match</Text>
      {loading ? <Text style={styles.muted}>Loading sports and venues...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Sport</Text>
      <View style={styles.optionRow}>
        {sports.map((sport) => (
          <Pressable key={sport.id} style={[styles.option, sportId === sport.id && styles.optionActive]} onPress={() => setSportId(sport.id)}>
            <Text style={[styles.optionText, sportId === sport.id && styles.optionTextActive]}>{sport.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Venue</Text>
      <View style={styles.optionColumn}>
        {venues.map((venue) => (
          <Pressable key={venue.id} style={[styles.option, venueId === venue.id && styles.optionActive]} onPress={() => setVenueId(venue.id)}>
            <Text style={[styles.optionText, venueId === venue.id && styles.optionTextActive]}>{venue.name}</Text>
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

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleCreate} disabled={submitting}>
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
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
});
