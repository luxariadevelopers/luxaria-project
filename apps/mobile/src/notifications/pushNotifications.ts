import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';

export type PushRegistrationResult = {
  status: 'granted' | 'denied' | 'unavailable' | 'registered' | 'error';
  expoPushToken: string | null;
  message: string;
};

export type PushPlatform = 'ios' | 'android';

const noopSubscription = { remove: () => undefined };

type NotificationsModule = typeof import('expo-notifications');
type NotificationLike = {
  request: {
    content: {
      title?: string | null;
      data?: unknown;
    };
  };
};
type NotificationResponseLike = {
  notification: NotificationLike;
};

/**
 * Expo Go on Android throws if remote push APIs are used (SDK 53+).
 * Keep the module unloaded there so the app can still run.
 */
export function isNativePushAvailable() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }
  if (isRunningInExpoGo() && Platform.OS === 'android') {
    return false;
  }
  return true;
}

function getNotifications(): NotificationsModule | null {
  if (!isNativePushAvailable()) {
    return null;
  }
  // Lazy require — avoids Expo Go Android crash on import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as NotificationsModule;
}

export function resolvePushPlatform(): PushPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function configureForegroundNotificationHandler() {
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }
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
  const Notifications = getNotifications();
  if (!Notifications) {
    return {
      status: 'unavailable',
      expoPushToken: null,
      message: isRunningInExpoGo()
        ? 'Push notifications require a development build on Android (not Expo Go)'
        : 'Push notifications are not available on this platform',
    };
  }

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
  notification: NotificationLike,
): Record<string, unknown> {
  const content = notification.request.content;
  const payload = content.data;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

export function getLastNotificationResponse() {
  const Notifications = getNotifications();
  if (!Notifications) {
    return Promise.resolve(null);
  }
  return Notifications.getLastNotificationResponseAsync().catch(() => null);
}

export function addNotificationReceivedListener(
  listener: (notification: NotificationLike) => void,
) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return noopSubscription;
  }
  return Notifications.addNotificationReceivedListener(
    listener as Parameters<
      NotificationsModule['addNotificationReceivedListener']
    >[0],
  );
}

export function addNotificationResponseListener(
  listener: (response: NotificationResponseLike) => void,
) {
  const Notifications = getNotifications();
  if (!Notifications) {
    return noopSubscription;
  }
  return Notifications.addNotificationResponseReceivedListener(
    listener as Parameters<
      NotificationsModule['addNotificationResponseReceivedListener']
    >[0],
  );
}

export async function getDevicePushTokenString(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' ? token.data : null;
  } catch {
    return null;
  }
}
