import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../src/components/Screen';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { AppCard } from '../src/components/ui/AppCard';
import { AppButton } from '../src/components/ui/AppButton';
import { AppInput } from '../src/components/ui/AppInput';
import { Chip } from '../src/components/ui/Chip';
import { LoadingState } from '../src/components/states/LoadingState';
import { ErrorState } from '../src/components/states/ErrorState';
import { EmptyState } from '../src/components/states/EmptyState';
import { useSports } from '../src/hooks/useSports';
import { useVenues } from '../src/hooks/useVenues';
import { apiClient } from '../src/lib/api';

type LocalSportPreference = {
  sportId: string;
  prefersSingles: boolean;
  prefersDoubles: boolean;
  minPreferredRating?: string;
  maxPreferredRating?: string;
  priority: number;
};

type LocalAvailability = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
};

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const;

export default function PreferencesScreen() {
  const { data: sports, loading: sportsLoading, error: sportsError, refresh: refreshSports } = useSports();
  const { data: venues, loading: venuesLoading, error: venuesError, refresh: refreshVenues } = useVenues();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [sportPreferences, setSportPreferences] = useState<LocalSportPreference[]>([]);
  const [preferredVenueIds, setPreferredVenueIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<LocalAvailability[]>([]);
  const [newDay, setNewDay] = useState(6);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('12:00');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const preferences = await apiClient.getMyPreferences();
        setSportPreferences(
          preferences.sportPreferences.map((item) => ({
            sportId: item.sportId,
            prefersSingles: item.prefersSingles,
            prefersDoubles: item.prefersDoubles,
            minPreferredRating: item.minPreferredRating?.toString() ?? '',
            maxPreferredRating: item.maxPreferredRating?.toString() ?? '',
            priority: item.priority,
          })),
        );
        setPreferredVenueIds(preferences.preferredVenues.map((item) => item.venueId));
        setAvailability(
          preferences.availability.map((item) => ({
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            timezone: item.timezone,
          })),
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load preferences.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const indexBySportId = useMemo(
    () => new Map(sportPreferences.map((item, index) => [item.sportId, index])),
    [sportPreferences],
  );

  function toggleSport(sportId: string) {
    const index = indexBySportId.get(sportId);
    if (index === undefined) {
      setSportPreferences((current) => [
        ...current,
        { sportId, prefersSingles: true, prefersDoubles: true, minPreferredRating: '', maxPreferredRating: '', priority: current.length + 1 },
      ]);
      return;
    }
    setSportPreferences((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function patchSport(sportId: string, patch: Partial<LocalSportPreference>) {
    setSportPreferences((current) => current.map((item) => (item.sportId === sportId ? { ...item, ...patch } : item)));
  }

  function toggleVenue(venueId: string) {
    setPreferredVenueIds((current) =>
      current.includes(venueId) ? current.filter((id) => id !== venueId) : [...current, venueId],
    );
  }

  function addAvailabilitySlot() {
    const key = `${newDay}:${newStart}:${newEnd}`;
    const hasDuplicate = availability.some(
      (item) => `${item.dayOfWeek}:${item.startTime}:${item.endTime}` === key,
    );
    if (hasDuplicate) {
      setSaveError('This availability slot already exists.');
      return;
    }

    setAvailability((current) => [
      ...current,
      {
        dayOfWeek: newDay,
        startTime: newStart,
        endTime: newEnd,
        timezone: 'Asia/Singapore',
      },
    ]);
    setSaveError('');
  }

  return (
    <Screen>
      <ScreenHeader title="Player preferences" subtitle="Improve match recommendations with your sports, venues, and availability." />

      {loading || sportsLoading || venuesLoading ? <LoadingState message="Loading preferences..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {sportsError ? <ErrorState message={sportsError} onRetry={refreshSports} /> : null}
      {venuesError ? <ErrorState message={venuesError} onRetry={refreshVenues} /> : null}

      {!loading && !error ? (
        <>
          <AppCard>
            <Text style={styles.heading}>Sports I play</Text>
            <View style={styles.rowWrap}>
              {sports.map((sport) => {
                const selected = indexBySportId.has(sport.id);
                return (
                  <Chip
                    key={sport.id}
                    label={sport.name}
                    active={selected}
                    onPress={() => toggleSport(sport.id)}
                  />
                );
              })}
            </View>
            {sportPreferences.length === 0 ? (
              <EmptyState title="No sports selected" message="Add sports to improve match recommendations." />
            ) : null}
            {sportPreferences.map((sportPreference) => {
              const sport = sports.find((item) => item.id === sportPreference.sportId);
              return (
                <View key={sportPreference.sportId} style={styles.sectionBlock}>
                  <Text style={styles.subheading}>{sport?.name ?? 'Sport preference'}</Text>
                  <View style={styles.rowWrap}>
                    <Chip
                      label="Singles"
                      active={sportPreference.prefersSingles}
                      onPress={() => patchSport(sportPreference.sportId, { prefersSingles: !sportPreference.prefersSingles })}
                    />
                    <Chip
                      label="Doubles"
                      active={sportPreference.prefersDoubles}
                      onPress={() => patchSport(sportPreference.sportId, { prefersDoubles: !sportPreference.prefersDoubles })}
                    />
                  </View>
                  <AppInput
                    label="Minimum preferred rating"
                    value={sportPreference.minPreferredRating}
                    onChangeText={(value) => patchSport(sportPreference.sportId, { minPreferredRating: value })}
                    keyboardType="numeric"
                  />
                  <AppInput
                    label="Maximum preferred rating"
                    value={sportPreference.maxPreferredRating}
                    onChangeText={(value) => patchSport(sportPreference.sportId, { maxPreferredRating: value })}
                    keyboardType="numeric"
                  />
                </View>
              );
            })}
          </AppCard>

          <AppCard>
            <Text style={styles.heading}>Preferred venues</Text>
            <View style={styles.rowWrap}>
              {venues.map((venue) => (
                <Chip
                  key={venue.id}
                  label={venue.name}
                  active={preferredVenueIds.includes(venue.id)}
                  onPress={() => toggleVenue(venue.id)}
                />
              ))}
            </View>
          </AppCard>

          <AppCard>
            <Text style={styles.heading}>Weekly availability</Text>
            <View style={styles.rowWrap}>
              {DAY_OPTIONS.map((day) => (
                <Chip
                  key={day.value}
                  label={day.label}
                  active={newDay === day.value}
                  onPress={() => setNewDay(day.value)}
                />
              ))}
            </View>
            <AppInput label="Start time (HH:mm)" value={newStart} onChangeText={setNewStart} />
            <AppInput label="End time (HH:mm)" value={newEnd} onChangeText={setNewEnd} />
            <AppButton variant="secondary" onPress={addAvailabilitySlot}>Add slot</AppButton>
            {availability.map((slot, index) => (
              <View key={`${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}-${index}`} style={styles.availabilityItem}>
                <Text style={styles.value}>{DAY_OPTIONS.find((day) => day.value === slot.dayOfWeek)?.label} {slot.startTime}-{slot.endTime}</Text>
                <AppButton variant="secondary" onPress={() => setAvailability((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</AppButton>
              </View>
            ))}
          </AppCard>

          {saveError ? <ErrorState message={saveError} /> : null}
          {saveSuccess ? <Text style={styles.successText}>{saveSuccess}</Text> : null}

          <AppButton
            loading={saveLoading}
            onPress={async () => {
              setSaveLoading(true);
              setSaveError('');
              setSaveSuccess('');
              try {
                await apiClient.updateSportPreferences({
                  sports: sportPreferences.map((item, index) => ({
                    sportId: item.sportId,
                    prefersSingles: item.prefersSingles,
                    prefersDoubles: item.prefersDoubles,
                    minPreferredRating: item.minPreferredRating ? Number(item.minPreferredRating) : undefined,
                    maxPreferredRating: item.maxPreferredRating ? Number(item.maxPreferredRating) : undefined,
                    priority: sportPreferences.length - index,
                  })),
                });
                await apiClient.updatePreferredVenues({
                  venues: preferredVenueIds.map((venueId, index) => ({
                    venueId,
                    priority: preferredVenueIds.length - index,
                  })),
                });
                await apiClient.updateAvailability({ availability });
                setSaveSuccess('Preferences updated.');
              } catch (savePreferencesError) {
                setSaveError(savePreferencesError instanceof Error ? savePreferencesError.message : 'Could not save preferences.');
              } finally {
                setSaveLoading(false);
              }
            }}
          >
            Save preferences
          </AppButton>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontWeight: '700', color: '#20304a' },
  subheading: { fontSize: 15, fontWeight: '700', color: '#20304a' },
  sectionBlock: { gap: 8, paddingTop: 6 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  availabilityItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  value: { color: '#44516a' },
  successText: { color: '#0b6b3a', fontWeight: '600' },
});
