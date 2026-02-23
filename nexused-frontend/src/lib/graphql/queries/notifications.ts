import { gql } from '@apollo/client';

export const MY_NOTIFICATION_PREFERENCES_QUERY = gql`
  query MyNotificationPreferences {
    myNotificationPreferences {
      emailOnGrade
      emailOnAssignment
      emailOnEnrollment
      emailOnDueReminder
      emailOnMessage
    }
  }
`;
