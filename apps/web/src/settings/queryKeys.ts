export const SETTINGS_QUERY_KEY = ['settings'] as const;

export const notificationPreferencesQueryKey = [
  ...SETTINGS_QUERY_KEY,
  'notification-preferences',
] as const;
