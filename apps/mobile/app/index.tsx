import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/auth/AuthContext';

const links = [
  { href: '/profile', label: 'Player Profile' },
  { href: '/discover', label: 'Match Discovery' },
  { href: '/create-match', label: 'Create Match' },
  { href: '/ratings', label: 'Ratings' },
] as const;

export default function HomeScreen() {
  const { user, authLoading, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sports Matchmaking MVP</Text>
      <Text style={styles.subtitle}>{authLoading ? 'Loading session...' : user ? `Signed in as ${user.displayName}` : 'Sign in to create, join, and score matches.'}</Text>
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
    backgroundColor: '#f7f8fa',
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: '#566074',
    marginBottom: 8,
  },
  link: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1f4ad3',
    borderWidth: 1,
    borderColor: '#d9dfee',
  },
  logout: {
    backgroundColor: '#20304a',
    borderRadius: 10,
    padding: 14,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
});
