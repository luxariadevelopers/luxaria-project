import { apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ListNotificationsQuery,
  MarkAllReadResult,
  NotificationsListResult,
  PublicNotification,
} from './types';

export async function fetchNotifications(
  query: ListNotificationsQuery = {},
): Promise<NotificationsListResult> {
  const res = await apiGet<PublicNotification[]>('/notifications', {
    ...query,
  });
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
  const result = await fetchNotifications({
    unreadOnly: true,
    page: 1,
    limit: 1,
  });
  return result.meta?.total ?? 0;
}

export async function markNotificationRead(
  id: string,
): Promise<PublicNotification | null> {
  const res = await apiPatch<PublicNotification>(
    `/notifications/${id}/read`,
  );
  return res.data ?? null;
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await apiPost<MarkAllReadResult>('/notifications/read-all');
  return res.data?.modifiedCount ?? 0;
}
