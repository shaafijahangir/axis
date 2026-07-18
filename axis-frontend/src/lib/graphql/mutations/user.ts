import { gql } from '@apollo/client';

/**
 * Update the current user's profile, including preferences.
 */
export const UPDATE_PROFILE_MUTATION = gql`
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
`;

/**
 * Update just the user's preferences (convenience wrapper).
 * The input.preferences field is a JSON string.
 */
export const UPDATE_PREFERENCES_MUTATION = gql`
  mutation UpdatePreferences($preferences: String!) {
    updateProfile(input: { preferences: $preferences }) {
      id
      preferences
    }
  }
`;
