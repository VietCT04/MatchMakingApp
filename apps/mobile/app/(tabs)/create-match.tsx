import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SportFormat } from '@sports-matchmaking/shared';
import { useAuth } from '../../src/auth/AuthContext';
import { apiClient } from '../../src/lib/api';
import { useSports } from '../../src/hooks/useSports';
import { useVenues } from '../../src/hooks/useVenues';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppButton } from '../../src/components/ui/AppButton';
import { Chip } from '../../src/components/ui/Chip';
import { ErrorState } from '../../src/components/states/ErrorState';
import { LoadingState } from '../../src/components/states/LoadingState';

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
      await wait(500);
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
    <Screen>
      <ScreenHeader title="Create match" subtitle="Set up a game and invite players to join." />
      {!authLoading && !user ? <ErrorState message="Login required to create a match." /> : null}
      {loading ? <LoadingState message="Loading sports and venues..." /> : null}
      {optionsError ? <ErrorState message={optionsError} onRetry={retryLoad} /> : null}
      {submitError ? <ErrorState message={submitError} /> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      <AppCard>
        <Text style={styles.sectionTitle}>Sport</Text>
        <View style={styles.optionRow}>
          {sports.map((sport) => (
            <Chip key={sport.id} label={sport.name} active={selectedSportId === sport.id} onPress={() => setSportId(sport.id)} />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Venue</Text>
        <View style={styles.optionRow}>
          {venues.map((venue) => (
            <Chip key={venue.id} label={venue.name} active={selectedVenueId === venue.id} onPress={() => setVenueId(venue.id)} />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Format</Text>
        <View style={styles.optionRow}>
          {[SportFormat.SINGLES, SportFormat.DOUBLES].map((item) => (
            <Chip
              key={item}
              label={item === SportFormat.SINGLES ? 'Singles' : 'Doubles'}
              active={format === item}
              onPress={() => setFormat(item)}
            />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Details</Text>
        <AppInput value={title} onChangeText={setTitle} placeholder="Match title" />
        <AppInput value={description} onChangeText={setDescription} placeholder="Optional notes" multiline style={styles.multilineInput} />
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <AppInput
          value={startsAt}
          onChangeText={setStartsAt}
          placeholder="2026-05-01T09:00:00.000Z"
          autoCapitalize="none"
          helperText="Use ISO datetime format. Example: 2026-05-01T09:00:00.000Z"
        />
      </AppCard>

      <AppCard>
        <Text style={styles.sectionTitle}>Players & Rating Range</Text>
        <AppInput value={maxPlayers} onChangeText={setMaxPlayers} placeholder="Max players" keyboardType="number-pad" />
        <View style={styles.rowInputs}>
          <AppInput style={styles.halfInput} value={minRating} onChangeText={setMinRating} placeholder="Min rating" keyboardType="number-pad" />
          <AppInput style={styles.halfInput} value={maxRating} onChangeText={setMaxRating} placeholder="Max rating" keyboardType="number-pad" />
        </View>
      </AppCard>

      <AppButton loading={submitting} disabled={!user || loading} onPress={handleCreate}>Create match</AppButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#20304a' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  multilineInput: { minHeight: 72, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  success: { color: '#067647', fontWeight: '600' },
});
