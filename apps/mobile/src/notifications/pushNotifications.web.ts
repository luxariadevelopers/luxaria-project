/**
 * Web stubs — expo-notifications native APIs are unavailable in the browser.
 * Metro resolves this file for `platform=web` so the native module is never loaded.
 */

export type PushRegistrationResult = {
  status: 'granted' | 'denied' | 'unavailable' | 'registered' | 'error';
  expoPushToken: string | null;
  message: string;
};

export type PushPlatform = 'ios' | 'android';

const noopSubscription = { remove: () => undefined };

type NotificationLike = {
  request: {
    content: {
      data?: unknown;
    };
  };
};

export function isNativePushAvailable() {
  return false;
}

export function resolvePushPlatform(): PushPlatform {
  return 'android';
}

export function configureForegroundNotificationHandler() {
  // no-op on web
}

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  return {
    status: 'unavailable',
    expoPushToken: null,
    message: 'Push notifications are not available on web',
  };
}

export function extractNotificationData(
  notification: NotificationLike,
): Record<string, unknown> {
  const payload = notification.request.content.data;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

export function getLastNotificationResponse() {
  return Promise.resolve(null);
}

export function addNotificationReceivedListener(
  _listener: (notification: NotificationLike) => void,
) {
  return noopSubscription;
}

export function addNotificationResponseListener(
  _listener: (response: { notification: NotificationLike }) => void,
) {
  return noopSubscription;
}

export async function getDevicePushTokenString(): Promise<string | null> {
  return null;
}
