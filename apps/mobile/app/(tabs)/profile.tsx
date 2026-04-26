import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { UserDto } from '@sports-matchmaking/shared';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { useUserRatings } from '../../src/hooks/useUserRatings';
import { useSports } from '../../src/hooks/useSports';

export default function ProfileScreen() {
  const { user: authUser, authLoading, logout, refreshMe } = useAuth();
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: ratingsData, loading: ratingsLoading, error: ratingsError, refresh: refreshRatings } = useUserRatings(Boolean(authUser));
  const { data: sports } = useSports();

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
        setUser(refreshed ?? authUser);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load profile.');
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [authUser, refreshMe]);

  useFocusEffect(
    useCallback(() => {
      if (authUser) {
        void refreshRatings();
      }
    }, [authUser, refreshRatings]),
  );

  const sportNameById = useMemo(() => new Map(sports.map((sport) => [sport.id, sport.name])), [sports]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      {!authLoading && !authUser ? <Text style={styles.error}>Login required to view your profile.</Text> : null}
      {loading ? <Text style={styles.muted}>Loading profile...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {user ? (
        <View style={styles.card}>
          <Text style={styles.heading}>{user.displayName || 'Player'}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email || 'No email available'}</Text>
          <Text style={styles.label}>Bio</Text>
          <Text style={styles.value}>{user.bio || 'No bio added yet.'}</Text>
          <Text style={styles.label}>Home location</Text>
          <Text style={styles.value}>{user.homeLocationText || 'No home location added yet.'}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.heading}>Ratings Summary</Text>
        {ratingsLoading ? <Text style={styles.muted}>Loading ratings summary...</Text> : null}
        {!ratingsLoading && ratingsError ? <Text style={styles.error}>{ratingsError}</Text> : null}
        {!ratingsLoading && !ratingsError && ratingsData.ratings.length === 0 ? <Text style={styles.muted}>No ratings yet.</Text> : null}
        {ratingsData.ratings.slice(0, 6).map((rating) => (
          <Text key={rating.id} style={styles.value}>
            {(sportNameById.get(rating.sportId) ?? 'Unknown sport')} {rating.format === 'SINGLES' ? 'Singles' : 'Doubles'}: {rating.rating} ({rating.gamesPlayed} games)
          </Text>
        ))}
      </View>

      {authUser ? (
        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 20, gap: 14, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#17263b' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d5deec',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  heading: { fontSize: 18, fontWeight: '700', color: '#20304a' },
  label: { color: '#66748e', fontSize: 12 },
  value: { color: '#44516a' },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
  logoutButton: { backgroundColor: '#20304a', borderRadius: 10, padding: 14, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '700' },
});

