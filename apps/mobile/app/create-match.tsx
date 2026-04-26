import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SportFormat } from '@sports-matchmaking/shared';
import { useAuth } from '../src/auth/AuthContext';
import { apiClient } from '../src/lib/api';
import { useSports } from '../src/hooks/useSports';
import { useVenues } from '../src/hooks/useVenues';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function CreateMatchScreen() {
  const { user, authLoading } = useAuth();
  const { data: sports, loading: sportsLoading, error: sportsError, refresh: refreshSports } = useSports();
  const { data: venues, loading: venuesLoading, error: venuesError, refresh: refreshVenues } = useVenues();
  const [sportId, setSportId] = useState<string | undefined>();
  const [venueId, setVenueId] = useState<string | undefined>();
  const [format, setFormat] = useState<SportFormat>(SportFormat.DOUBLES);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString());
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [minRating, setMinRating] = useState('1000');
  const [maxRating, setMaxRating] = useState('1500');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loading = sportsLoading || venuesLoading;
  const optionsError = sportsError || venuesError;
  const selectedSportId = useMemo(() => sportId ?? sports[0]?.id, [sportId, sports]);
  const selectedVenueId = useMemo(() => venueId ?? venues[0]?.id, [venueId, venues]);

  async function handleCreate() {
    setSubmitError('');
    setSuccessMessage('');

    if (!user) {
      setSubmitError('Login required to create a match.');
      return;
    }

    const effectiveSportId = selectedSportId;
    const effectiveVenueId = selectedVenueId;
    const parsedMaxPlayers = Number(maxPlayers);
    const parsedMinRating = minRating === '' ? undefined : Number(minRating);
    const parsedMaxRating = maxRating === '' ? undefined : Number(maxRating);

    if (!effectiveSportId) {
      setSubmitError('Select a sport.');
      return;
    }
    if (!effectiveVenueId) {
      setSubmitError('Select a venue.');
      return;
    }
    if (!title.trim()) {
      setSubmitError('Match title is required.');
      return;
    }
    if (!Number.isInteger(parsedMaxPlayers) || parsedMaxPlayers <= 0) {
      setSubmitError('Max players must be a positive whole number.');
      return;
    }
    if (format === SportFormat.SINGLES && parsedMaxPlayers !== 2) {
      setSubmitError('Singles matches should use 2 players.');
      return;
    }
    if (format === SportFormat.DOUBLES && parsedMaxPlayers < 4) {
      setSubmitError('Doubles matches should use at least 4 players.');
      return;
    }
    if (Number.isNaN(Date.parse(startsAt))) {
      setSubmitError('Start time must be a valid ISO datetime.');
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
      setSuccessMessage('Match created successfully. Opening match details...');
      await wait(600);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Match</Text>
      <Text style={styles.subtitle}>Set up a game and invite players to join.</Text>

      {!authLoading && !user ? <Text style={styles.error}>Login required to create a match.</Text> : null}
      {loading ? <Text style={styles.muted}>Loading sports and venues...</Text> : null}
      {optionsError ? (
        <View style={styles.messageBox}>
          <Text style={styles.error}>{optionsError}</Text>
          <Pressable style={styles.secondaryButton} onPress={retryLoad}>
            <Text style={styles.secondaryButtonText}>Retry loading options</Text>
          </Pressable>
        </View>
      ) : null}
      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sport</Text>
        <View style={styles.optionRow}>
          {sports.map((sport) => (
            <Pressable
              key={sport.id}
              style={[styles.option, selectedSportId === sport.id && styles.optionActive]}
              onPress={() => setSportId(sport.id)}
            >
              <Text style={[styles.optionText, selectedSportId === sport.id && styles.optionTextActive]}>{sport.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Venue</Text>
        <View style={styles.optionColumn}>
          {venues.map((venue) => (
            <Pressable
              key={venue.id}
              style={[styles.option, selectedVenueId === venue.id && styles.optionActive]}
              onPress={() => setVenueId(venue.id)}
            >
              <Text style={[styles.optionText, selectedVenueId === venue.id && styles.optionTextActive]}>{venue.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Format</Text>
        <View style={styles.optionRow}>
          {[SportFormat.SINGLES, SportFormat.DOUBLES].map((item) => (
            <Pressable
              key={item}
              style={[styles.option, format === item && styles.optionActive]}
              onPress={() => setFormat(item)}
            >
              <Text style={[styles.optionText, format === item && styles.optionTextActive]}>
                {item === SportFormat.SINGLES ? 'Singles' : 'Doubles'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Match title (for example, Saturday Morning Doubles)"
        />
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional notes (level, bring shuttles, etc.)"
          multiline
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <TextInput
          style={styles.input}
          value={startsAt}
          onChangeText={setStartsAt}
          placeholder="2026-05-01T09:00:00.000Z"
          autoCapitalize="none"
        />
        <Text style={styles.helperText}>Use ISO datetime format. Example: 2026-05-01T09:00:00.000Z</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Players & Rating Range</Text>
        <TextInput
          style={styles.input}
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          placeholder="Max players"
          keyboardType="number-pad"
        />
        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={minRating}
            onChangeText={setMinRating}
            placeholder="Min rating"
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={maxRating}
            onChangeText={setMaxRating}
            placeholder="Max rating"
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Pressable
        style={[styles.primaryButton, (submitting || !user || loading) && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={submitting || !user || loading}
      >
        <Text style={styles.primaryButtonText}>{submitting ? 'Creating match...' : 'Create match'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 20, gap: 14, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#17263b' },
  subtitle: { color: '#5f6d86' },
  section: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d5deec',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#20304a' },
  input: { borderWidth: 1, borderColor: '#c9d3e6', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  multilineInput: { minHeight: 72, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionColumn: { gap: 8 },
  option: { borderWidth: 1, borderColor: '#cfd7e6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  optionActive: { backgroundColor: '#20304a', borderColor: '#20304a' },
  optionText: { color: '#20304a', textTransform: 'capitalize', fontWeight: '600' },
  optionTextActive: { color: '#fff' },
  helperText: { color: '#66748e', fontSize: 12 },
  rowInputs: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  messageBox: { gap: 8 },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
  success: { color: '#067647', fontWeight: '600' },
  primaryButton: { backgroundColor: '#1f4ad3', borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderColor: '#1f4ad3', borderWidth: 1, borderRadius: 8, padding: 12, alignSelf: 'flex-start' },
  secondaryButtonText: { color: '#1f4ad3', fontWeight: '700' },
  buttonDisabled: { opacity: 0.65 },
});
