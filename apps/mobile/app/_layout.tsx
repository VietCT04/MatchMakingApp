import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider } from '../src/auth/AuthContext';
import { useAuth } from '../src/auth/AuthContext';

const PUBLIC_ROUTES = new Set(['login', 'register']);

function AuthGate() {
  const { authLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const currentRoute = segments[0];
  const isPublicRoute = currentRoute ? PUBLIC_ROUTES.has(currentRoute) : false;

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user && !isPublicRoute) {
      router.replace('/login');
      return;
    }
    if (user && isPublicRoute) {
      router.replace('/discover');
    }
  }, [authLoading, isPublicRoute, router, user]);

  if (authLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
