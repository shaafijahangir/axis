/**
 * WHY: Mobile Apollo Client uses Bearer token auth (unlike web which uses httpOnly cookies).
 * The JWT strategy on the backend accepts both cookies and Authorization headers.
 * PATTERN: authLink fetches the stored token on every request — works correctly even
 * after token refresh because it reads from SecureStore each time, not a stale closure.
 */
import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client';
import { createHttpLink } from '@apollo/client/link/http';
import { setContext } from '@apollo/client/link/context';
import { getToken } from './auth';

// WHY: Android emulator maps host machine's localhost to 10.0.2.2.
// iOS simulator can use localhost directly. For real devices, use the machine's
// LAN IP. In production, this would be the deployed API URL.
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const httpLink = createHttpLink({
  uri: `${BACKEND_URL}/api/graphql`,
});

// WHY: setContext runs before every request, reading the latest token from
// SecureStore so we always send a fresh value even if it was stored after
// the client was initialised.
const authLink = setContext(async (_, { headers }) => {
  const token = await getToken();
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          myFeedItems: {
            merge: false, // Always replace on refetch
          },
          myConversations: {
            merge: false,
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
