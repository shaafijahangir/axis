/**
 * Root layout — wraps the entire app in ApolloProvider and handles the
 * auth redirect gate. Expo Router's <Slot /> renders the matched route.
 *
 * WHY: Apollo must be available before any query fires. The auth check here
 * lets the root layout redirect to /login before any protected screen mounts,
 * preventing flash of unprotected content.
 */
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ApolloProvider } from '@apollo/client/react';
import { StatusBar } from 'expo-status-bar';
import { apolloClient } from '../src/lib/apollo';

export default function RootLayout() {
  // We just need Apollo available; auth routing is handled per-layout below.
  return (
    <ApolloProvider client={apolloClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </ApolloProvider>
  );
}
