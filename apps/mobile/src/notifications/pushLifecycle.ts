import * as Device from 'expo-device';
import {
  registerPushToken,
  unregisterPushToken,
} from '@/api/notifications';
import { getErrorMessage } from '@/api/client';
import {
  isNativePushAvailable,
  registerForPushNotificationsAsync,
  resolvePushPlatform,
} from './pushNotifications';

let activeExpoPushToken: string | null = null;

export function getActiveExpoPushToken() {
  return activeExpoPushToken;
}

export async function syncPushRegistrationWithBackend(): Promise<{
  registered: boolean;
  message: string;
}> {
  if (!isNativePushAvailable()) {
    return {
      registered: false,
      message: 'Push registration skipped on web',
    };
  }

  if (!Device.isDevice) {
    return {
      registered: false,
      message: 'Push registration skipped on simulator',
    };
  }

  const local = await registerForPushNotificationsAsync();
  if (local.status === 'denied') {
    activeExpoPushToken = null;
    return { registered: false, message: local.message };
  }
  if (!local.expoPushToken) {
    activeExpoPushToken = null;
    return { registered: false, message: local.message };
  }

  try {
    await registerPushToken({
      token: local.expoPushToken,
      platform: resolvePushPlatform(),
      deviceName: Device.modelName ?? Device.deviceName ?? undefined,
    });
    activeExpoPushToken = local.expoPushToken;
    return { registered: true, message: 'Push token registered with server' };
  } catch (error) {
    activeExpoPushToken = local.expoPushToken;
    return {
      registered: false,
      message: getErrorMessage(error, 'Failed to register push token'),
    };
  }
}

export async function unregisterPushFromBackend() {
  const token = activeExpoPushToken;
  activeExpoPushToken = null;
  if (!token) {
    return;
  }
  try {
    await unregisterPushToken(token);
  } catch {
    // Best effort during logout.
  }
}
