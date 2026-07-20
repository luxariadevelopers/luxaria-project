import type { PaginationMeta } from '@luxaria/shared-types';
import { apiGet, apiPatch, apiPost } from './client';

/** Mirrors Nest `toPublicNotification` inbox payload. */
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

export type ListNotificationsParams = {
  unreadOnly?: boolean;
  eventType?: string;
  page?: number;
  limit?: number;
};

export type ListNotificationsResult = {
  items: InboxNotification[];
  meta: PaginationMeta | null;
};

export async function listNotifications(
  params?: ListNotificationsParams,
): Promise<ListNotificationsResult> {
  const response = await apiGet<InboxNotification[]>('/notifications', params);
  return {
    items: response.data ?? [],
    meta: (response.meta as PaginationMeta | undefined) ?? null,
  };
}

export async function markNotificationRead(
  id: string,
): Promise<InboxNotification> {
  const response = await apiPatch<InboxNotification>(
    `/notifications/${id}/read`,
  );
  if (!response.data) {
    throw new Error(response.message || 'Could not mark notification read');
  }
  return response.data;
}

export async function markAllNotificationsRead(): Promise<{
  modifiedCount: number;
}> {
  const response = await apiPost<{ modifiedCount: number }>(
    '/notifications/read-all',
  );
  return response.data ?? { modifiedCount: 0 };
}

/** Unread total from inbox meta (`unreadOnly=true`, limit 1). */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const { meta } = await listNotifications({
    unreadOnly: true,
    page: 1,
    limit: 1,
  });
  return meta?.total ?? 0;
}
