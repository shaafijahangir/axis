import { gql } from '@apollo/client';

export const UPDATE_NOTIFICATION_PREFERENCES_MUTATION = gql`
  mutation UpdateNotificationPreferences(
    $input: UpdateNotificationPreferencesInput!
  ) {
    updateNotificationPreferences(input: $input) {
      emailOnGrade
      emailOnAssignment
      emailOnEnrollment
      emailOnDueReminder
      emailOnMessage
    }
  }
`;
