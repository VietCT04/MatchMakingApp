import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../src/auth/AuthContext';

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
    setFormError('');
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
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Set up your player profile and start joining matches.</Text>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={[styles.input, displayNameError ? styles.inputError : null]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
          />
          {displayNameError ? <Text style={styles.error}>{displayNameError}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, passwordError ? styles.inputError : null]}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
          />
          {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
        </View>

        <Pressable style={[styles.button, submitting && styles.buttonDisabled]} disabled={submitting} onPress={handleRegister}>
          <Text style={styles.buttonText}>{submitting ? 'Creating account...' : 'Create account'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d6deec', borderRadius: 14, padding: 18, gap: 14 },
  title: { fontSize: 26, fontWeight: '700', color: '#17263b' },
  subtitle: { fontSize: 14, color: '#5f6d86' },
  fieldGroup: { gap: 6 },
  label: { fontWeight: '600', color: '#20304a' },
  input: { borderWidth: 1, borderColor: '#c9d3e6', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  inputError: { borderColor: '#b42318' },
  button: { backgroundColor: '#1f4ad3', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#b42318', fontSize: 13 },
});
