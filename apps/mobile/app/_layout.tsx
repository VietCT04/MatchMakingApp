import { useEffect } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider } from '../src/auth/AuthContext';
import { useAuth } from '../src/auth/AuthContext';

function AuthGate() {
  const { authLoading, user } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const inAuthGroup = segments[0] === '(auth)';
  const isPublicRoute = inAuthGroup || segments[0] === 'login' || segments[0] === 'register';

  useEffect(() => {
    if (authLoading) {
      return;
    }
    const isRootIndex = pathname === '/';
    if (!user && !isPublicRoute) {
      router.replace('/login');
      return;
    }
    if (user && isRootIndex) {
      router.replace('/discover');
      return;
    }
    if (user && isPublicRoute) {
      router.replace('/discover');
    }
  }, [authLoading, isPublicRoute, pathname, router, user]);

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
        headerShown: false,
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
