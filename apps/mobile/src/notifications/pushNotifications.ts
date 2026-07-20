import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export type PushRegistrationResult = {
  status: 'granted' | 'denied' | 'unavailable' | 'placeholder';
  expoPushToken: string | null;
  message: string;
};

/**
 * Local push permission + Expo token fetch.
 * Nest has no device/push-token registration endpoint yet — token is not posted to the API.
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
    const token = await Notifications.getExpoPushTokenAsync();
    return {
      status: 'placeholder',
      expoPushToken: token.data,
      message:
        'Push token obtained locally. No Nest push-token registration API is available yet.',
    };
  } catch {
    return {
      status: 'placeholder',
      expoPushToken: null,
      message:
        'Push placeholder ready. Configure EAS projectId / FCM to enable tokens.',
    };
  }
}
