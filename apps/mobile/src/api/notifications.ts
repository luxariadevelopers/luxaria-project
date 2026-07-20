import type { PaginationMeta } from '@luxaria/shared-types';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';

/** Public inbox item from backend `toPublicNotification`. */
export type InboxNotification = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channels: string[];
  isRead: boolean;
  readAt: string | null;
  projectId: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string | null;
};

export type ListNotificationsQuery = {
  unreadOnly?: boolean;
  eventType?: string;
  page?: number;
  limit?: number;
};

export type NotificationsListResult = {
  items: InboxNotification[];
  meta: PaginationMeta | null;
};

export type MarkAllReadResult = {
  modifiedCount: number;
};

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

export async function listNotifications(
  query: ListNotificationsQuery = {},
): Promise<NotificationsListResult> {
  const res = await apiGet<InboxNotification[]>('/notifications', query);
  return {
    items: res.data ?? [],
    meta: res.meta
      ? {
          page: Number(res.meta.page ?? query.page ?? 1),
          limit: Number(res.meta.limit ?? query.limit ?? 20),
          total: Number(res.meta.total ?? 0),
          totalPages: Number(res.meta.totalPages ?? 0),
          hasNextPage: Boolean(res.meta.hasNextPage),
          hasPrevPage: Boolean(res.meta.hasPrevPage),
        }
      : null,
  };
}

/** No dedicated count endpoint — use unread list `meta.total`. */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const result = await listNotifications({
    unreadOnly: true,
    page: 1,
    limit: 1,
  });
  return result.meta?.total ?? 0;
}

export async function markNotificationRead(
  id: string,
): Promise<InboxNotification | null> {
  const res = await apiPatch<InboxNotification>(`/notifications/${id}/read`);
  return res.data ?? null;
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await apiPost<MarkAllReadResult>('/notifications/read-all');
  return res.data?.modifiedCount ?? 0;
}

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
