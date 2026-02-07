import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

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

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
