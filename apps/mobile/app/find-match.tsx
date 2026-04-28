import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SportFormat } from '@sports-matchmaking/shared';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { AppCard } from '../src/components/ui/AppCard';
import { AppButton } from '../src/components/ui/AppButton';
import { AppInput } from '../src/components/ui/AppInput';
import { Chip } from '../src/components/ui/Chip';
import { LoadingState } from '../src/components/states/LoadingState';
import { ErrorState } from '../src/components/states/ErrorState';
import { useSports } from '../src/hooks/useSports';
import { useVenues } from '../src/hooks/useVenues';
import { apiClient } from '../src/lib/api';

const RADIUS_OPTIONS = [3, 5, 10, 20] as const;

export default function FindMatchScreen() {
  const { data: sports, loading: sportsLoading, error: sportsError, refresh: refreshSports } = useSports();
  const { data: venues, loading: venuesLoading, error: venuesError, refresh: refreshVenues } = useVenues();
  const [selectedSportId, setSelectedSportId] = useState<string>('');
  const [format, setFormat] = useState<SportFormat>(SportFormat.SINGLES);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [earliestStart, setEarliestStart] = useState('');
  const [latestEnd, setLatestEnd] = useState('');
  const [preferredVenueId, setPreferredVenueId] = useState('');
  const [minElo, setMinElo] = useState('');
  const [maxElo, setMaxElo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const nowIso = useMemo(() => new Date().toISOString().slice(0, 16), []);

  return (
    <Screen>
      <ScreenHeader title="Find match" subtitle="Create a matchmaking ticket and search for compatible players." />
      {(sportsLoading || venuesLoading) ? <LoadingState message="Loading sports and venues..." /> : null}
      {sportsError ? <ErrorState message={sportsError} onRetry={refreshSports} /> : null}
      {venuesError ? <ErrorState message={venuesError} onRetry={refreshVenues} /> : null}

      <AppCard>
        <Text style={styles.label}>Sport</Text>
        <View style={styles.wrapRow}>
          {sports.map((sport) => (
            <Chip
              key={sport.id}
              label={sport.name}
              active={selectedSportId === sport.id}
              onPress={() => setSelectedSportId(sport.id)}
            />
          ))}
        </View>

        <Text style={styles.label}>Format</Text>
        <View style={styles.wrapRow}>
          <Chip label="Singles" active={format === SportFormat.SINGLES} onPress={() => setFormat(SportFormat.SINGLES)} />
          <Chip label="Doubles" active={format === SportFormat.DOUBLES} onPress={() => setFormat(SportFormat.DOUBLES)} />
        </View>

        <Text style={styles.label}>Radius</Text>
        <View style={styles.wrapRow}>
          {RADIUS_OPTIONS.map((value) => (
            <Chip key={value} label={`${value} km`} active={radiusKm === value} onPress={() => setRadiusKm(value)} />
          ))}
        </View>

        <AppInput
          label="Earliest start (ISO datetime)"
          helperText={`Example: ${nowIso}`}
          value={earliestStart}
          onChangeText={setEarliestStart}
        />
        <AppInput
          label="Latest end (ISO datetime)"
          helperText={`Example: ${nowIso}`}
          value={latestEnd}
          onChangeText={setLatestEnd}
        />

        <Text style={styles.label}>Preferred venue (optional)</Text>
        <View style={styles.wrapRow}>
          {venues.slice(0, 12).map((venue) => (
            <Chip
              key={venue.id}
              label={venue.name}
              active={preferredVenueId === venue.id}
              onPress={() => setPreferredVenueId((current) => (current === venue.id ? '' : venue.id))}
            />
          ))}
        </View>

        <AppInput label="Min Elo (optional)" value={minElo} onChangeText={setMinElo} keyboardType="numeric" />
        <AppInput label="Max Elo (optional)" value={maxElo} onChangeText={setMaxElo} keyboardType="numeric" />

        {error ? <ErrorState message={error} /> : null}
        {message ? <Text style={styles.info}>{message}</Text> : null}

        <AppButton
          loading={loading}
          onPress={async () => {
            if (!selectedSportId) {
              setError('Select a sport.');
              return;
            }
            setLoading(true);
            setError('');
            setMessage('');
            try {
              await apiClient.createMatchmakingTicket({
                sportId: selectedSportId,
                format,
                radiusKm,
                earliestStart,
                latestEnd,
                preferredVenueId: preferredVenueId || undefined,
                minElo: minElo ? Number(minElo) : undefined,
                maxElo: maxElo ? Number(maxElo) : undefined,
              });
              const result = await apiClient.runMatchmakingSearch();
              if (result.found && result.proposal?.id) {
                setMessage('Auto match found. Review proposal now.');
                router.push('/matchmaking-proposals');
              } else {
                setMessage(result.message ?? 'No match found yet. Try widening your radius or time window.');
              }
            } catch (requestError) {
              setError(requestError instanceof Error ? requestError.message : 'Could not run matchmaking search.');
            } finally {
              setLoading(false);
            }
          }}
        >
          Find Match
        </AppButton>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: '#20304a', fontWeight: '700' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  info: { color: '#0b6b3a', fontWeight: '600' },
});
