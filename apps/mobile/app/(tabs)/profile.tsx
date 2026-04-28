import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ReliabilityStatsDto, UserDto } from '@sports-matchmaking/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { useUserRatings } from '../../src/hooks/useUserRatings';
import { useSports } from '../../src/hooks/useSports';
import { apiClient } from '../../src/lib/api';
import { Screen } from '../../src/components/Screen';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AppCard } from '../../src/components/ui/AppCard';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { Badge } from '../../src/components/ui/Badge';
import { LoadingState } from '../../src/components/states/LoadingState';
import { ErrorState } from '../../src/components/states/ErrorState';
import { EmptyState } from '../../src/components/states/EmptyState';

export default function ProfileScreen() {
  const { user: authUser, authLoading, logout, refreshMe } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editHomeLocationText, setEditHomeLocationText] = useState('');
  const [reliability, setReliability] = useState<ReliabilityStatsDto | null>(null);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [reliabilityLoading, setReliabilityLoading] = useState(true);
  const [reliabilityError, setReliabilityError] = useState('');
  const { data: ratingsData, loading: ratingsLoading, error: ratingsError, refresh: refreshRatings } = useUserRatings(Boolean(authUser));
  const { data: sports } = useSports();

  const sportNameById = useMemo(() => new Map(sports.map((sport) => [sport.id, sport.name])), [sports]);

  const loadReliability = useCallback(async () => {
    if (!authUser) {
      setReliability(null);
      setReliabilityLoading(false);
      setReliabilityError('');
      return;
    }
    setReliabilityLoading(true);
    setReliabilityError('');
    try {
      const stats = await apiClient.getMyReliability();
      setReliability(stats);
    } catch (loadError) {
      setReliabilityError(loadError instanceof Error ? loadError.message : 'Could not load reliability.');
    } finally {
      setReliabilityLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    async function loadProfile() {
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const refreshed = await refreshMe();
        const source = refreshed ?? authUser;
        const preferences = await apiClient.getMyPreferences();
        setHasPreferences(
          preferences.sportPreferences.length > 0 ||
          preferences.preferredVenues.length > 0 ||
          preferences.availability.length > 0,
        );
        setUser(source);
        setEditDisplayName(source.displayName ?? '');
        setEditBio(source.bio ?? '');
        setEditHomeLocationText(source.homeLocationText ?? '');
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load profile.');
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
    void loadReliability();
  }, [authUser, refreshMe, loadReliability]);

  useFocusEffect(
    useCallback(() => {
      if (authUser) {
        void refreshRatings();
        void loadReliability();
      }
    }, [authUser, refreshRatings, loadReliability]),
  );

  return (
    <Screen>
      <ScreenHeader title="Profile" subtitle="Your player identity, reliability, and rating summary." />
      {!authLoading && !authUser ? <ErrorState message="Login required to view your profile." /> : null}
      {loading ? <LoadingState message="Loading profile..." /> : null}
      {error ? <ErrorState message={error} /> : null}

      {user ? (
        <>
          <AppCard>
            <Text style={styles.heading}>{user.displayName || 'Player'}</Text>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email || 'No email available'}</Text>
            <Text style={styles.label}>Bio</Text>
            <Text style={styles.value}>{user.bio || 'No bio added yet.'}</Text>
            <Text style={styles.label}>Home location</Text>
            <Text style={styles.value}>{user.homeLocationText || 'No home location added yet.'}</Text>
          </AppCard>

          <AppCard>
            <Text style={styles.heading}>Edit profile</Text>
            <AppInput label="Display name" value={editDisplayName} onChangeText={setEditDisplayName} maxLength={80} />
            <AppInput label="Bio" value={editBio} onChangeText={setEditBio} maxLength={500} multiline />
            <AppInput label="Home location" value={editHomeLocationText} onChangeText={setEditHomeLocationText} maxLength={120} />
            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
            {saveSuccess ? <Text style={styles.successText}>{saveSuccess}</Text> : null}
            <AppButton
              loading={saveLoading}
              onPress={async () => {
                setSaveLoading(true);
                setSaveError('');
                setSaveSuccess('');
                try {
                  const updated = await apiClient.updateMyProfile({
                    displayName: editDisplayName.trim(),
                    bio: editBio.trim() || undefined,
                    homeLocationText: editHomeLocationText.trim() || undefined,
                  });
                  setUser(updated);
                  setSaveSuccess('Profile updated.');
                } catch (saveProfileError) {
                  setSaveError(saveProfileError instanceof Error ? saveProfileError.message : 'Could not update profile.');
                } finally {
                  setSaveLoading(false);
                }
              }}
            >
              Save profile
            </AppButton>
            <AppButton variant="secondary" onPress={() => router.push('/preferences')}>
              Player preferences
            </AppButton>
            {!hasPreferences ? (
              <Text style={styles.helperText}>Add your sports and availability to improve match recommendations.</Text>
            ) : null}
          </AppCard>
        </>
      ) : null}

      <AppCard>
        <Text style={styles.heading}>Reliability</Text>
        {reliabilityLoading ? <LoadingState message="Loading reliability..." /> : null}
        {!reliabilityLoading && reliabilityError ? <ErrorState message={reliabilityError} onRetry={loadReliability} /> : null}
        {!reliabilityLoading && !reliabilityError && reliability ? (
          <>
            <Badge tone="info">{reliability.reliabilityScore} reliability</Badge>
            <View style={styles.statsGrid}>
              <Text style={styles.value}>Completed: {reliability.completedMatches}</Text>
              <Text style={styles.value}>Cancellations: {reliability.cancelledMatches}</Text>
              <Text style={styles.value}>Late cancellations: {reliability.lateCancellationCount}</Text>
              <Text style={styles.value}>No-shows: {reliability.noShowCount}</Text>
              <Text style={styles.value}>Disputes: {reliability.disputedResults}</Text>
              <Text style={styles.value}>Reports: {reliability.reportCount}</Text>
            </View>
          </>
        ) : null}
      </AppCard>

      <AppCard>
        <Text style={styles.heading}>Ratings Summary</Text>
        {ratingsLoading ? <LoadingState message="Loading ratings..." /> : null}
        {!ratingsLoading && ratingsError ? <ErrorState message={ratingsError} onRetry={refreshRatings} /> : null}
        {!ratingsLoading && !ratingsError && ratingsData.ratings.length === 0 ? (
          <EmptyState title="No ratings yet." message="Play and verify matches to build rating history." />
        ) : null}
        {ratingsData.ratings.slice(0, 6).map((rating) => (
          <Text key={rating.id} style={styles.value}>
            {(sportNameById.get(rating.sportId) ?? 'Unknown sport')} {rating.format === 'SINGLES' ? 'Singles' : 'Doubles'}: {rating.rating} ({rating.gamesPlayed} games)
          </Text>
        ))}
      </AppCard>

      {authUser?.role === 'ADMIN' || authUser?.role === 'MODERATOR' ? (
        <AppButton variant="secondary" onPress={() => router.push('/moderation')}>
          Moderation
        </AppButton>
      ) : null}

      {authUser ? <AppButton variant="secondary" onPress={logout}>Logout</AppButton> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontWeight: '700', color: '#20304a' },
  label: { color: '#66748e', fontSize: 12 },
  value: { color: '#44516a' },
  statsGrid: { gap: 4 },
  errorText: { color: '#b42318' },
  successText: { color: '#0b6b3a' },
  helperText: { color: '#66748e' },
});
