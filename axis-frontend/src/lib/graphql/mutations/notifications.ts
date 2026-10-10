import { graphql } from '@/lib/graphql/__generated__';

export const UPDATE_NOTIFICATION_PREFERENCES_MUTATION = graphql(`
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
`);

export const MARK_NOTIFICATION_READ_MUTATION = graphql(`
  mutation MarkNotificationRead($id: String!) {
    markNotificationRead(id: $id) {
      id
      read
    }
  }
`);

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = graphql(`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`);

export const REGISTER_DEVICE_TOKEN_MUTATION = graphql(`
  mutation RegisterDeviceToken($token: String!, $platform: DevicePlatform!) {
    registerDeviceToken(token: $token, platform: $platform)
  }
`);
