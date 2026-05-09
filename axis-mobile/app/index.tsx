/**
 * Entry point — checks for stored token and redirects to either the tab
 * navigator (authenticated) or the login screen (unauthenticated).
 *
 * WHY: Expo Router requires a root index route. We use it as a redirect
 * gate rather than a real screen to avoid flickering between auth states.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { getToken } from '../src/lib/auth';

export default function IndexScreen() {
  useEffect(() => {
    void checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await getToken();
    if (token) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0f172a" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
