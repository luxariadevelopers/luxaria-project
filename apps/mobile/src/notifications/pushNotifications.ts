import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export type PushRegistrationResult = {
  status: 'granted' | 'denied' | 'unavailable' | 'registered' | 'error';
  expoPushToken: string | null;
  message: string;
};

export type PushPlatform = 'ios' | 'android';

export function resolvePushPlatform(): PushPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function configureForegroundNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request permission and fetch the Expo push token for this device.
 */
export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return {
      status: 'unavailable',
      expoPushToken: null,
      message: 'Push notifications require a physical device',
    };
  }

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;
  if (current.status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return {
      status: 'denied',
      expoPushToken: null,
      message: 'Notification permission denied',
    };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const token = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return {
      status: 'registered',
      expoPushToken: token.data,
      message: 'Push token ready',
    };
  } catch (error) {
    return {
      status: 'error',
      expoPushToken: null,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to obtain Expo push token',
    };
  }
}

export function extractNotificationData(
  notification: Notifications.Notification,
): Record<string, unknown> {
  const content = notification.request.content;
  const payload = content.data;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

export function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}

export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(listener);
}

export function addNotificationResponseListener(
  listener: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

export async function getDevicePushTokenString(): Promise<string | null> {
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' ? token.data : null;
  } catch {
    return null;
  }
}
