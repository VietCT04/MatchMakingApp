import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { StyleSheet, Text, View } from 'react-native';
import { MatchStatus } from '@sports-matchmaking/shared';
import { useMatches } from '../../src/hooks/useMatches';
import { useSports } from '../../src/hooks/useSports';
import { useAuth } from '../../src/auth/AuthContext';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AppButton } from '../../src/components/ui/AppButton';
import { Chip } from '../../src/components/ui/Chip';
import { AppCard } from '../../src/components/ui/AppCard';
import { Badge } from '../../src/components/ui/Badge';
import { LoadingState } from '../../src/components/states/LoadingState';
import { ErrorState } from '../../src/components/states/ErrorState';
import { EmptyState } from '../../src/components/states/EmptyState';

const RADIUS_OPTIONS = [3, 5, 10, 20] as const;
const LOCATION_PERMISSION_OFF_MESSAGE = 'Location is off. Showing all open matches.';

export default function DiscoverScreen() {
  const { token } = useAuth();
  const [selectedSportId, setSelectedSportId] = useState<string | undefined>();
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(5);
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationPermissionOff, setLocationPermissionOff] = useState(false);
  const [locationError, setLocationError] = useState('');
  const { data: sports, loading: sportsLoading, error: sportsError, refresh: refreshSports } = useSports();
  const {
    data: matches,
    loading: matchesLoading,
    error: matchesError,
    refresh: refreshMatches,
  } = useMatches({
    status: MatchStatus.OPEN,
    sportId: selectedSportId,
    latitude: locationCoords?.latitude,
    longitude: locationCoords?.longitude,
    radiusKm: locationCoords ? selectedRadiusKm : undefined,
    ranked: Boolean(token),
  });

  const loading = sportsLoading || matchesLoading || locationLoading;
  const error = sportsError || matchesError;
  const sportOptions = useMemo(() => [{ id: undefined, name: 'All' }, ...sports], [sports]);
  const usingLocation = Boolean(locationCoords);

  const refresh = useCallback(async () => {
    await Promise.all([refreshSports(), refreshMatches()]);
  }, [refreshMatches, refreshSports]);

  useFocusEffect(
    useCallback(() => {
      void refreshMatches();
    }, [refreshMatches]),
  );

  async function handleUseMyLocation() {
    setLocationLoading(true);
    setLocationError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationPermissionOff(true);
        setLocationCoords(null);
        return;
      }
      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationCoords({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });
      setLocationPermissionOff(false);
    } catch (requestError) {
      setLocationError(requestError instanceof Error ? requestError.message : 'Could not get your current location.');
    } finally {
      setLocationLoading(false);
    }
  }

  function clearLocationFilter() {
    setLocationCoords(null);
    setLocationError('');
  }

  return (
    <Screen>
      <ScreenHeader
        title={token ? 'Best matches for you' : 'Open matches'}
        subtitle={token ? 'Ranked by fit score for your profile.' : 'Browse open matches and join a game.'}
        action={
          <AppButton variant="secondary" onPress={() => router.push('/map')}>
            Map view
          </AppButton>
        }
      />

      <View style={styles.locationSection}>
        <AppButton loading={locationLoading} onPress={handleUseMyLocation}>
          Use my location
        </AppButton>
        {usingLocation ? (
          <View style={styles.locationInfoBox}>
            <Text style={styles.locationInfoText}>Nearby mode enabled within {selectedRadiusKm} km.</Text>
            <AppButton variant="secondary" onPress={clearLocationFilter}>Show all open matches</AppButton>
          </View>
        ) : null}
        {!usingLocation && locationPermissionOff ? <Text style={styles.muted}>{LOCATION_PERMISSION_OFF_MESSAGE}</Text> : null}
        {locationError ? <ErrorState message={locationError} /> : null}
      </View>

      <View style={styles.filterRow}>
        {RADIUS_OPTIONS.map((radius) => (
          <Chip
            key={radius}
            label={`${radius} km`}
            active={selectedRadiusKm === radius}
            disabled={!usingLocation}
            onPress={() => setSelectedRadiusKm(radius)}
          />
        ))}
      </View>

      <View style={styles.filterRow}>
        {sportOptions.map((sport) => (
          <Chip
            key={sport.id ?? 'all'}
            label={sport.name}
            active={selectedSportId === sport.id}
            onPress={() => setSelectedSportId(sport.id)}
          />
        ))}
      </View>

      {loading ? <LoadingState message="Loading matches..." /> : null}
      {error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {!loading && !error && matches.length === 0 ? <EmptyState title="No open matches found." message="Try another sport or create a match." /> : null}

      {matches.map((match) => {
        const players = match.participants?.filter((item) => item.status === 'JOINED').length ?? 0;
        const ratingRange = `${match.minRating ?? 'Any'}-${match.maxRating ?? 'Any'}`;
        return (
          <AppCard
            key={match.id}
            onPress={() => router.push({ pathname: '/match/[id]', params: { id: match.id } })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{match.title}</Text>
              <Badge>{match.status}</Badge>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Sport</Text>
              <Text style={styles.metaValue}>{match.sport?.name ?? match.sportId}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Format</Text>
              <Text style={styles.metaValue}>{match.format}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Venue</Text>
              <Text style={styles.metaValue}>{match.venue?.name ?? 'Venue TBD'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date & time</Text>
              <Text style={styles.metaValue}>{new Date(match.startsAt).toLocaleString()}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Rating range</Text>
              <Text style={styles.metaValue}>{ratingRange}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Players</Text>
              <Text style={styles.metaValue}>{players}/{match.maxPlayers}</Text>
            </View>
            <View style={styles.badgeRow}>
              {typeof match.fitScore === 'number' ? <Badge tone="info">{Math.round(match.fitScore)}% fit</Badge> : null}
              {usingLocation && match.distanceKm !== undefined ? <Badge tone="success">{match.distanceKm.toFixed(1)} km away</Badge> : null}
              {match.fitBreakdown?.reliabilityScore !== undefined ? (
                <Badge>{Math.round(match.fitBreakdown.reliabilityScore)} reliability</Badge>
              ) : null}
            </View>
          </AppCard>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  locationSection: { gap: 8 },
  locationInfoBox: { gap: 8 },
  locationInfoText: { color: '#20304a', fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#17263b', flex: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaLabel: { color: '#66748e', fontSize: 13 },
  metaValue: { color: '#20304a', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  muted: { color: '#6f7b91' },
});
