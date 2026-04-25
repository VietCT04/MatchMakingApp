import { Stack } from 'expo-router';
import { AuthProvider } from '../src/auth/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
        }}
      />
    </AuthProvider>
  );
}
