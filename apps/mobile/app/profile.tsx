import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RatingDto, UserDto } from '@sports-matchmaking/shared';
import { DEMO_USER_ID } from '../src/config/demoUser';
import { apiClient } from '../src/lib/api';

export default function ProfileScreen() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [ratings, setRatings] = useState<RatingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError('');
      try {
        const [userResponse, ratingsResponse] = await Promise.all([
          apiClient.getUserById(DEMO_USER_ID),
          apiClient.getUserRatings(DEMO_USER_ID),
        ]);
        setUser(userResponse);
        setRatings(ratingsResponse);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load profile.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Player Profile</Text>
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
        {ratings.length === 0 ? <Text style={styles.muted}>No ratings found.</Text> : null}
        {ratings.slice(0, 6).map((rating) => (
          <Text key={rating.id} style={styles.line}>
            {rating.sportId} | {rating.format}: {rating.rating} ({rating.gamesPlayed} games)
          </Text>
        ))}
      </View>

      <Text style={styles.note}>TODO: replace demo user profile with real auth context.</Text>
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
  note: { color: '#6f7b91', marginTop: 8 },
});
