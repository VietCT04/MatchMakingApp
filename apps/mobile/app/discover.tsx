import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMatches } from '../src/hooks/useMatches';
import { useSports } from '../src/hooks/useSports';
import { MatchStatus } from '@sports-matchmaking/shared';

const RADIUS_OPTIONS = [3, 5, 10, 20] as const;
const LOCATION_PERMISSION_OFF_MESSAGE = 'Location permission is off. Showing all open matches.';

export default function DiscoverScreen() {
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

  function onSportSelect(sportId?: string) {
    setSelectedSportId(sportId);
  }

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
      setLocationError(
        requestError instanceof Error ? requestError.message : 'Could not get your current location.',
      );
    } finally {
      setLocationLoading(false);
    }
  }

  function clearLocationFilter() {
    setLocationCoords(null);
    setLocationError('');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Open Matches</Text>

      <View style={styles.locationSection}>
        <Pressable style={styles.locationButton} onPress={handleUseMyLocation} disabled={locationLoading}>
          <Text style={styles.locationButtonText}>
            {locationLoading ? 'Getting location...' : 'Use my location'}
          </Text>
        </Pressable>
        {usingLocation ? (
          <View style={styles.locationInfoBox}>
            <Text style={styles.locationInfoText}>
              Nearby mode enabled within {selectedRadiusKm} km.
            </Text>
            <Pressable style={styles.clearButton} onPress={clearLocationFilter}>
              <Text style={styles.clearButtonText}>Show all open matches</Text>
            </Pressable>
          </View>
        ) : null}
        {!usingLocation && locationPermissionOff ? (
          <Text style={styles.muted}>{LOCATION_PERMISSION_OFF_MESSAGE}</Text>
        ) : null}
        {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
      </View>

      <View style={styles.filterRow}>
        {RADIUS_OPTIONS.map((radius) => (
          <Pressable
            key={radius}
            style={[styles.filter, selectedRadiusKm === radius && styles.filterActive]}
            onPress={() => setSelectedRadiusKm(radius)}
          >
            <Text style={[styles.filterText, selectedRadiusKm === radius && styles.filterTextActive]}>
              {radius} km
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.filterRow}>
        {sportOptions.map((sport) => (
          <Pressable
            key={sport.id ?? 'all'}
            style={[styles.filter, selectedSportId === sport.id && styles.filterActive]}
            onPress={() => onSportSelect(sport.id)}
          >
            <Text style={[styles.filterText, selectedSportId === sport.id && styles.filterTextActive]}>
              {sport.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? <Text style={styles.muted}>Loading matches...</Text> : null}
      {error ? (
        <View style={styles.messageBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
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
            {usingLocation && match.distanceKm !== undefined ? (
              <Text style={styles.distance}>{match.distanceKm.toFixed(1)} km away</Text>
            ) : null}
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
  locationSection: { gap: 8 },
  locationButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f4ad3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationButtonText: { color: '#fff', fontWeight: '700' },
  locationInfoBox: { gap: 8 },
  locationInfoText: { color: '#20304a', fontWeight: '600' },
  clearButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#20304a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearButtonText: { color: '#20304a', fontWeight: '600' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { borderWidth: 1, borderColor: '#cfd7e6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  filterActive: { backgroundColor: '#20304a', borderColor: '#20304a' },
  filterText: { color: '#20304a', textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderColor: '#d0d8e6', borderRadius: 8, borderWidth: 1, padding: 14, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  line: { color: '#44516a' },
  distance: { color: '#067647', fontWeight: '700' },
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
