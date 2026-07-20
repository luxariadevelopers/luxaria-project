import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

/**
 * Android emulator uses 10.0.2.2 to reach the host machine.
 * Override with EXPO_PUBLIC_API_BASE_URL for physical devices.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  extra?.apiBaseUrl ||
  'http://10.0.2.2:9000/api/v1';
