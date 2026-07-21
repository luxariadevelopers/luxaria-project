import { apiGet, apiPut } from '@/api/client';
import type {
  NotificationEventPreference,
  NotificationPreferences,
} from './types';

export async function fetchNotificationPreferences() {
  return apiGet<NotificationPreferences>('/notifications/preferences');
}

export async function updateNotificationPreferences(body: {
  muted?: boolean;
  events?: NotificationEventPreference[];
}) {
  return apiPut<NotificationPreferences>('/notifications/preferences', body);
}
