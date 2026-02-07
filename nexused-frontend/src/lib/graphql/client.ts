import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client';
import { ErrorLink } from '@apollo/client/link/error';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useAuthStore } from '@/stores/auth.store';

/**
 * WHY: Using credentials: 'include' sends httpOnly cookies automatically.
 * PATTERN: This is more secure than storing JWT in localStorage (XSS protection).
 * No authLink needed - the browser handles cookie transmission automatically.
 */
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
    : 'http://localhost:3001/api/graphql',
  credentials: 'include',
});

/**
 * DATA-005: Handle 401 errors by logging out and redirecting.
 * WHY: When JWT expires, the user should be redirected to login instead of
 * seeing cryptic errors or empty states.
 *
 * PATTERN: Apollo Client 4.0 uses ErrorLink class with combined error type.
 */
const errorLink = new ErrorLink(({ error }) => {
  let shouldLogout = false;

  // Check for UNAUTHENTICATED GraphQL error
  if (CombinedGraphQLErrors.is(error)) {
    shouldLogout = error.errors.some(
      (err) =>
        err.extensions?.code === 'UNAUTHENTICATED' ||
        err.message.toLowerCase().includes('unauthorized'),
    );
  } else {
    // Check for 401 network error
    const statusCode = (error as { statusCode?: number }).statusCode;
    shouldLogout = statusCode === 401;
  }

  if (shouldLogout) {
    // Clear auth state (this also calls the logout endpoint to clear the cookie)
    useAuthStore.getState().logout();

    // Redirect to login (only in browser)
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
