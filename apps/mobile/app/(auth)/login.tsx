import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppCard } from '../../src/components/ui/AppCard';

export default function LoginScreen() {
  const { authLoading, login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/discover');
    }
  }, [authLoading, user]);

  async function handleLogin() {
    const normalizedEmail = email.trim();
    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setFormError('');

    if (!normalizedEmail) {
      setEmailError('Email is required.');
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setEmailError('Enter a valid email address.');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    }
    if (hasError) {
      return;
    }

    setSubmitting(true);
    try {
      await login(normalizedEmail, password);
      router.replace('/discover');
    } catch (loginError) {
      setFormError(loginError instanceof Error ? loginError.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <AppCard>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to find matches, join games, and track your rating.</Text>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <AppInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          error={emailError}
        />
        <AppInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          error={passwordError}
        />
        <AppButton loading={submitting} onPress={handleLogin}>Login</AppButton>
        <Link href="/register" style={styles.link}>New here? Create an account</Link>
      </AppCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb', justifyContent: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#17263b' },
  subtitle: { fontSize: 14, color: '#5f6d86' },
  link: { color: '#1f4ad3', fontWeight: '600' },
  error: { color: '#b42318', fontSize: 13 },
});
