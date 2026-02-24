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

export const MY_NOTIFICATIONS_QUERY = gql`
  query MyNotifications($limit: Int, $offset: Int) {
    myNotifications(limit: $limit, offset: $offset) {
      id
      type
      title
      body
      data
      read
      createdAt
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT_QUERY = gql`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const VAPID_PUBLIC_KEY_QUERY = gql`
  query VapidPublicKey {
    vapidPublicKey {
      publicKey
    }
  }
`;
