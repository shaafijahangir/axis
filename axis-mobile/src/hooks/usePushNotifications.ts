/**
 * Push notification setup hook (MOB-APP-009).
 *
 * WHY: Called once on app mount after the user authenticates. Requests
 * permission, obtains the Expo push token, and registers it with the backend.
 * The backend stores the token under DevicePlatform.IOS or ANDROID and will
 * call the Expo Push API (https://exp.host/--/api/v2/push/send) for delivery.
 *
 * Notification tap handling: when the user taps a system notification while
 * the app is backgrounded/killed, `lastNotificationResponse` contains the
 * notification data. We extract the `url` field and navigate to it.
 *
 * TRADEOFF: We use Expo's managed push service rather than raw FCM/APNs
 * because it works on both platforms with zero native config in managed workflow.
 * Raw FCM is a Phase B option if we eject to bare workflow.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { apolloClient } from '../lib/apollo';
import { REGISTER_DEVICE_TOKEN_MUTATION } from '../graphql/queries';

// Show notifications as banners even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function platformEnum(): 'IOS' | 'ANDROID' | null {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return null; // Web — handled separately
}

async function registerForPushAsync(): Promise<string | null> {
  // Push tokens only work on physical devices
  if (!Device.isDevice) return null;

  const platform = platformEnum();
  if (!platform) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Axis',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0f172a',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

export function usePushNotifications(isAuthenticated: boolean) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Register token with backend
    void (async () => {
      const token = await registerForPushAsync();
      const platform = platformEnum();
      if (!token || !platform) return;

      try {
        await apolloClient.mutate({
          mutation: REGISTER_DEVICE_TOKEN_MUTATION,
          variables: { token, platform },
        });
      } catch {
        // Non-critical — app works fine without push registration
      }
    })();

    // Foreground notification listener (optional — just for logging/badge update)
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Could update an unread badge here in future
      });

    // Notification tap listener — navigate to the deep link URL
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | { url?: string }
          | undefined;
        if (data?.url) {
          // url is a frontend route like /courses/xxx/section/yyy/assignment/zzz
          // Map to mobile route: /courses/xxx?sectionId=yyy (best effort)
          router.push(data.url as Parameters<typeof router.push>[0]);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);
}
