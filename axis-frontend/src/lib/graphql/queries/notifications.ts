import { graphql } from '@/lib/graphql/__generated__';

export const MY_NOTIFICATION_PREFERENCES_QUERY = graphql(`
  query MyNotificationPreferences {
    myNotificationPreferences {
      emailOnGrade
      emailOnAssignment
      emailOnEnrollment
      emailOnDueReminder
      emailOnMessage
    }
  }
`);

export const MY_NOTIFICATIONS_QUERY = graphql(`
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
`);

export const UNREAD_NOTIFICATION_COUNT_QUERY = graphql(`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`);

export const VAPID_PUBLIC_KEY_QUERY = graphql(`
  query VapidPublicKey {
    vapidPublicKey {
      publicKey
    }
  }
`);
