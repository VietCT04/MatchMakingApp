import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppCard } from '../../src/components/ui/AppCard';

export default function RegisterScreen() {
  const { authLoading, register, user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/discover');
    }
  }, [authLoading, user]);

  async function handleRegister() {
    const normalizedDisplayName = displayName.trim();
    const normalizedEmail = email.trim();
    let hasError = false;

    setDisplayNameError('');
    setEmailError('');
    setPasswordError('');
    setFormError('');

    if (!normalizedDisplayName) {
      setDisplayNameError('Display name is required.');
      hasError = true;
    } else if (normalizedDisplayName.length < 2) {
      setDisplayNameError('Display name must have at least 2 characters.');
      hasError = true;
    }
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
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      hasError = true;
    }
    if (hasError) {
      return;
    }

    setSubmitting(true);
    try {
      await register(normalizedEmail, password, normalizedDisplayName);
      router.replace('/discover');
    } catch (registerError) {
      setFormError(registerError instanceof Error ? registerError.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <AppCard>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Set up your player profile and start joining matches.</Text>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <AppInput label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" error={displayNameError} />
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
          placeholder="At least 8 characters"
          secureTextEntry
          error={passwordError}
        />
        <AppButton loading={submitting} onPress={handleRegister}>Create account</AppButton>
        <Link href="/login" style={styles.link}>Already have an account? Log in.</Link>
      </AppCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb', justifyContent: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#17263b' },
  subtitle: { fontSize: 14, color: '#5f6d86' },
  error: { color: '#b42318', fontSize: 13 },
  link: { color: '#1f4ad3', fontWeight: '600' },
});
