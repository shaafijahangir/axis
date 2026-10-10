import { graphql } from '@/lib/graphql/__generated__';

/**
 * Update the current user's profile, including preferences.
 */
export const UPDATE_PROFILE_MUTATION = graphql(`
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      id
      firstName
      lastName
      preferences
      title
      officeLocation
    }
  }
`);

/**
 * Update just the user's preferences (convenience wrapper).
 * The input.preferences field is a JSON string.
 */
export const UPDATE_PREFERENCES_MUTATION = graphql(`
  mutation UpdatePreferences($preferences: String!) {
    updateProfile(input: { preferences: $preferences }) {
      id
      preferences
    }
  }
`);
