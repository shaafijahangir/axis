/**
 * Login screen — email + password, biometric shortcut for returning users,
 * link to register.
 *
 * WHY: Biometric check runs first if a token exists in SecureStore.
 * If no token, biometric makes no sense — user must type credentials.
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, Link } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../../src/hooks/useAuth';
import { getToken } from '../../src/lib/auth';

export default function LoginScreen() {
  const { login, biometricUnlock, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  // Check if biometric unlock is available (token exists + hardware enrolled)
  useEffect(() => {
    void checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const [token, hasHardware, isEnrolled] = await Promise.all([
      getToken(),
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    setShowBiometric(!!token && hasHardware && isEnrolled);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      Alert.alert('Login failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometric = async () => {
    const success = await biometricUnlock();
    if (success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert(
        'Authentication failed',
        'Please sign in with your password.',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Axis</Text>
          <Text style={styles.subtitle}>Sign in to your student account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@university.edu"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {showBiometric && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometric}
              activeOpacity={0.7}
            >
              <Text style={styles.biometricText}>
                Use Face ID / Fingerprint
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  button: {
    height: 48,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  biometricText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  footerLink: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
});
