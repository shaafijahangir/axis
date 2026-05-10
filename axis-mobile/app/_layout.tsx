/**
 * Root layout — wraps the entire app in ApolloProvider and handles the
 * auth redirect gate. Expo Router's <Slot /> renders the matched route.
 *
 * WHY: Apollo must be available before any query fires. The auth check here
 * lets the root layout redirect to /login before any protected screen mounts,
 * preventing flash of unprotected content.
 *
 * PushNotificationSetup is a child component (not inline) so it can call
 * usePushNotifications after ApolloProvider is mounted — the hook uses
 * apolloClient directly for the token registration mutation.
 */
import { Stack } from 'expo-router';
import { ApolloProvider } from '@apollo/client/react';
import { StatusBar } from 'expo-status-bar';
import { apolloClient } from '../src/lib/apollo';
import { useAuth } from '../src/hooks/useAuth';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

/**
 * Inner component so usePushNotifications runs inside ApolloProvider context.
 * It reads auth state and registers the Expo push token once authenticated.
 */
function PushNotificationSetup() {
  const { isAuthenticated } = useAuth();
  usePushNotifications(isAuthenticated);
  return null;
}

export default function RootLayout() {
  return (
    <ApolloProvider client={apolloClient}>
      <StatusBar style="auto" />
      <PushNotificationSetup />
      <Stack screenOptions={{ headerShown: false }} />
    </ApolloProvider>
  );
}
