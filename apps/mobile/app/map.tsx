import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';
import type { MatchWithDetailsDto } from '@sports-matchmaking/shared';
import { MatchStatus } from '@sports-matchmaking/shared';
import { useAuth } from '../src/auth/AuthContext';
import { apiClient } from '../src/lib/api';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { AppCard } from '../src/components/ui/AppCard';
import { AppButton } from '../src/components/ui/AppButton';
import { Badge } from '../src/components/ui/Badge';
import { Chip } from '../src/components/ui/Chip';
import { LoadingState } from '../src/components/states/LoadingState';
import { ErrorState } from '../src/components/states/ErrorState';
import { EmptyState } from '../src/components/states/EmptyState';
import { colors } from '../src/components/ui/tokens';

const RADIUS_OPTIONS = [3, 5, 10, 20] as const;
const DEFAULT_LATITUDE_DELTA = 0.08;
const DEFAULT_LONGITUDE_DELTA = 0.08;

type Coords = {
  latitude: number;
  longitude: number;
};

function getMarkerCoordinates(matches: MatchWithDetailsDto[]) {
  const coordinateCounts = new Map<string, number>();
  return matches
    .map((match) => {
      const latitude = match.venue?.latitude;
      const longitude = match.venue?.longitude;
      if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
        return null;
      }

      const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
      const count = coordinateCounts.get(key) ?? 0;
      coordinateCounts.set(key, count + 1);
      const offset = count * 0.00008;

      return {
        match,
        latitude: latitude + offset,
        longitude: longitude + offset,
      };
    })
    .filter((item): item is { match: MatchWithDetailsDto; latitude: number; longitude: number } => item !== null);
}

export default function MapScreen() {
  const { token } = useAuth();
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(5);
  const [locationCoords, setLocationCoords] = useState<Coords | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<MatchWithDetailsDto[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const markerData = useMemo(() => getMarkerCoordinates(matches), [matches]);
  const selectedMatch = useMemo(
    () => matches.find((item) => item.id === selectedMatchId) ?? matches[0] ?? null,
    [matches, selectedMatchId],
  );

  const fetchNearbyMatches = useCallback(
    async (coords: Coords) => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.getMatches({
          status: MatchStatus.OPEN,
          latitude: coords.latitude,
          longitude: coords.longitude,
          radiusKm: selectedRadiusKm,
          ranked: Boolean(token),
        });
        setMatches(response);
        setSelectedMatchId((current) => current ?? response[0]?.id ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load nearby matches.');
      } finally {
        setLoading(false);
      }
    },
    [selectedRadiusKm, token],
  );

  const requestLocationAndLoad = useCallback(async () => {
    setLocationLoading(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setPermissionDenied(true);
        setLocationCoords(null);
        setMatches([]);
        setSelectedMatchId(null);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      };
      setPermissionDenied(false);
      setLocationCoords(coords);
      await fetchNearbyMatches(coords);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not get your current location.');
    } finally {
      setLocationLoading(false);
    }
  }, [fetchNearbyMatches]);

  useFocusEffect(
    useCallback(() => {
      if (!locationCoords && !permissionDenied) {
        void requestLocationAndLoad();
        return;
      }
      if (locationCoords) {
        void fetchNearbyMatches(locationCoords);
      }
    }, [fetchNearbyMatches, locationCoords, permissionDenied, requestLocationAndLoad]),
  );

  const mapRegion = useMemo(() => {
    if (!locationCoords) {
      return undefined;
    }
    return {
      latitude: locationCoords.latitude,
      longitude: locationCoords.longitude,
      latitudeDelta: DEFAULT_LATITUDE_DELTA,
      longitudeDelta: DEFAULT_LONGITUDE_DELTA,
    };
  }, [locationCoords]);

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <ScreenHeader title="Map discovery" subtitle="Browse nearby open matches on the map." />

        <View style={styles.topActions}>
          <AppButton variant="secondary" loading={locationLoading} onPress={() => void requestLocationAndLoad()}>
            Use my location
          </AppButton>
          <AppButton variant="secondary" onPress={() => router.back()}>
            Back to Discover
          </AppButton>
        </View>

        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((radius) => (
            <Chip key={radius} label={`${radius} km`} active={selectedRadiusKm === radius} onPress={() => setSelectedRadiusKm(radius)} />
          ))}
        </View>

        {locationLoading && !locationCoords ? <LoadingState message="Fetching your location..." /> : null}
        {!locationLoading && permissionDenied ? (
          <EmptyState
            title="Location permission required"
            message="Enable location access to view nearby matches on the map."
            actionLabel="Retry location access"
            onAction={() => void requestLocationAndLoad()}
          />
        ) : null}
        {error ? <ErrorState message={error} onRetry={() => void requestLocationAndLoad()} /> : null}
        {loading && locationCoords ? <LoadingState message="Loading nearby matches..." /> : null}

        {!loading && !error && locationCoords ? (
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              showsUserLocation
              showsMyLocationButton
              loadingEnabled
            >
              {markerData.map((item) => (
                <Marker
                  key={item.match.id}
                  coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                  title={item.match.title}
                  description={item.match.venue?.name ?? 'Venue'}
                  onPress={() => setSelectedMatchId(item.match.id)}
                />
              ))}
            </MapView>

            {selectedMatch ? (
              <View style={styles.previewWrap}>
                <AppCard>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle}>{selectedMatch.title}</Text>
                    <Badge>{selectedMatch.status}</Badge>
                  </View>
                  <Text style={styles.metaText}>{selectedMatch.sport?.name ?? selectedMatch.sportId}</Text>
                  <Text style={styles.metaText}>{selectedMatch.venue?.name ?? 'Venue TBD'}</Text>
                  <Text style={styles.metaText}>{new Date(selectedMatch.startsAt).toLocaleString()}</Text>
                  <Text style={styles.metaText}>
                    {(selectedMatch.participants?.filter((participant) => participant.status === 'JOINED').length ?? 0)}/
                    {selectedMatch.maxPlayers} players
                  </Text>
                  <View style={styles.badgeRow}>
                    {typeof selectedMatch.fitScore === 'number' ? <Badge tone="info">{Math.round(selectedMatch.fitScore)}% fit</Badge> : null}
                    {typeof selectedMatch.distanceKm === 'number' ? (
                      <Badge tone="success">{selectedMatch.distanceKm.toFixed(1)} km away</Badge>
                    ) : null}
                  </View>
                  <AppButton onPress={() => router.push({ pathname: '/match/[id]', params: { id: selectedMatch.id } })}>
                    View match
                  </AppButton>
                </AppCard>
              </View>
            ) : (
              <View style={styles.previewWrap}>
                <EmptyState title="No nearby matches" message="Try a wider radius or create a new match." />
              </View>
            )}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    backgroundColor: colors.background,
  },
  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  previewWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  metaText: {
    color: colors.muted,
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
