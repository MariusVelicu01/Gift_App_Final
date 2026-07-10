import { Platform } from 'react-native';
import { apiFetch } from './api';

if (Platform.OS !== 'web') {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerPushToken(token: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = require('expo-notifications');

  const existing = await Notifications.getPermissionsAsync();
  if (!existing.granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) return;
  }

  const pushTokenData = await Notifications.getExpoPushTokenAsync();
  const expoPushToken = pushTokenData.data;

  await apiFetch(
    '/push-tokens',
    {
      method: 'POST',
      body: JSON.stringify({ token: expoPushToken }),
    },
    token
  ).catch(() => {});
}

export async function unregisterPushToken(token: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = require('expo-notifications');

  try {
    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    await apiFetch(
      '/push-tokens',
      {
        method: 'DELETE',
        body: JSON.stringify({ token: pushTokenData.data }),
      },
      token
    ).catch(() => {});
  } catch {}
}

export function addNotificationListener(handler: (notification: any) => void) {
  if (Platform.OS === 'web') return { remove: () => {} };
  const Notifications = require('expo-notifications');
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseListener(handler: (response: any) => void) {
  if (Platform.OS === 'web') return { remove: () => {} };
  const Notifications = require('expo-notifications');
  return Notifications.addNotificationResponseReceivedListener(handler);
}
