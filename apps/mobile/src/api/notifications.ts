import { apiDelete, apiGet, apiPost, apiPut } from './client';

export type NotificationChannelPreference = {
  channel: 'in_app' | 'push' | 'email' | 'whatsapp';
  enabled: boolean;
};

export type NotificationEventPreference = {
  eventType: string;
  enabled: boolean;
  channels?: NotificationChannelPreference[];
};

export type NotificationPreferences = {
  userId: string;
  muted: boolean;
  events: NotificationEventPreference[];
};

export type PushDeviceTokenRecord = {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  deviceName: string | null;
  invalidatedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export async function fetchNotificationPreferences() {
  return apiGet<NotificationPreferences>('/notifications/preferences');
}

export async function updateNotificationPreferences(body: {
  muted?: boolean;
  events?: NotificationEventPreference[];
}) {
  return apiPut<NotificationPreferences>('/notifications/preferences', body);
}

export async function registerPushToken(body: {
  token: string;
  platform: 'ios' | 'android';
  deviceName?: string;
}) {
  return apiPost<PushDeviceTokenRecord>('/notifications/push-tokens', body);
}

export async function unregisterPushToken(token: string) {
  return apiDelete<{ removed: boolean }>('/notifications/push-tokens', {
    data: { token },
  });
}

export async function fetchMyPushTokens() {
  return apiGet<PushDeviceTokenRecord[]>('/notifications/push-tokens/mine');
}
