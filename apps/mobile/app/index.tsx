import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

const links = [
  { href: '/login', label: 'Login Placeholder' },
  { href: '/profile', label: 'Player Profile' },
  { href: '/discover', label: 'Match Discovery' },
  { href: '/create-match', label: 'Create Match' },
  { href: '/match/mock-match-1', label: 'Match Detail' },
  { href: '/ratings', label: 'Ratings' },
] as const;

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sports Matchmaking MVP</Text>
      <Text style={styles.subtitle}>Badminton, pickleball, tennis, and more.</Text>
      {links.map((item) => (
        <Link key={item.href} href={item.href} style={styles.link}>
          {item.label}
        </Link>
      ))}
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
});
