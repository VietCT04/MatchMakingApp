import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { UserDto } from '@sports-matchmaking/shared';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { useUserRatings } from '../src/hooks/useUserRatings';

export default function ProfileScreen() {
  const { user: authUser, authLoading, logout, refreshMe } = useAuth();
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: ratingsData, loading: ratingsLoading, error: ratingsError, refresh: refreshRatings } = useUserRatings(Boolean(authUser));
  const ratings = ratingsData.ratings;

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

    loadProfile();
  }, [authUser, refreshMe]);

  useFocusEffect(
    useCallback(() => {
      if (authUser) {
        void refreshRatings();
      }
    }, [authUser, refreshRatings]),
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Player Profile</Text>
      {!authLoading && !authUser ? <Text style={styles.error}>Login required to view your profile.</Text> : null}
      {loading ? <Text style={styles.muted}>Loading profile...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {user ? (
        <View style={styles.section}>
          <Text style={styles.heading}>{user.displayName}</Text>
          <Text style={styles.line}>{user.email}</Text>
          <Text style={styles.line}>{user.bio ?? 'No bio yet'}</Text>
          <Text style={styles.line}>{user.homeLocationText ?? 'No home location yet'}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.heading}>Ratings Summary</Text>
        {ratingsLoading ? <Text style={styles.muted}>Loading ratings summary...</Text> : null}
        {!ratingsLoading && ratingsError ? <Text style={styles.error}>{ratingsError}</Text> : null}
        {!ratingsLoading && !ratingsError && ratings.length === 0 ? <Text style={styles.muted}>No ratings found.</Text> : null}
        {ratings.slice(0, 6).map((rating) => (
          <Text key={rating.id} style={styles.line}>
            {rating.sportId} | {rating.format}: {rating.rating} ({rating.gamesPlayed} games)
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
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '700' },
  section: { gap: 6 },
  heading: { fontSize: 18, fontWeight: '700' },
  line: { color: '#44516a' },
  muted: { color: '#6f7b91' },
  error: { color: '#b42318' },
  logoutButton: { backgroundColor: '#20304a', borderRadius: 8, padding: 14, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '700' },
});
