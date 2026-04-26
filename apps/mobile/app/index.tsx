import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthContext';

const links = [
  { href: '/discover', label: 'Discover matches' },
  { href: '/create-match', label: 'Create match' },
  { href: '/ratings', label: 'View ratings' },
  { href: '/profile', label: 'Profile' },
] as const;

export default function HomeScreen() {
  const { user, authLoading, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sports Matchmaking</Text>
      <Text style={styles.subtitle}>
        {authLoading
          ? 'Loading session...'
          : user
            ? `Signed in as ${user.displayName}`
            : 'Sign in to discover, play, and improve your rating.'}
      </Text>
      <View style={styles.flowCard}>
        <Text style={styles.flowTitle}>How It Works</Text>
        <Text style={styles.flowItem}>1. Find nearby ranked matches</Text>
        <Text style={styles.flowItem}>2. Create a match</Text>
        <Text style={styles.flowItem}>3. Play and submit score</Text>
        <Text style={styles.flowItem}>4. Verify result</Text>
        <Text style={styles.flowItem}>5. Improve your rating</Text>
      </View>
      {!authLoading && !user ? (
        <>
          <Link href="/login" style={styles.link}>Login</Link>
          <Link href="/register" style={styles.link}>Register</Link>
        </>
      ) : null}
      {user ? links.map((item) => (
        <Link key={item.href} href={item.href} style={styles.link}>
          {item.label}
        </Link>
      )) : null}
      {user ? (
        <Pressable style={styles.logout} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#17263b',
  },
  subtitle: {
    fontSize: 15,
    color: '#566074',
  },
  flowCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d6deec',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  flowTitle: {
    fontWeight: '700',
    color: '#20304a',
    marginBottom: 2,
  },
  flowItem: {
    color: '#44516a',
  },
  link: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f4ad3',
    borderWidth: 1,
    borderColor: '#d6deec',
    fontWeight: '600',
  },
  logout: {
    backgroundColor: '#20304a',
    borderRadius: 12,
    padding: 14,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
});
