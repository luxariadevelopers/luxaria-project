import type { PaginationMeta } from '@luxaria/shared-types';
import type { NotificationEventTypeCode } from './eventTypes';

/** Public inbox item from `toPublicNotification`. */
export type PublicNotification = {
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
  eventType?: NotificationEventTypeCode;
  page?: number;
  limit?: number;
};

export type MarkAllReadResult = {
  modifiedCount: number;
};

export type NotificationsListResult = {
  items: PublicNotification[];
  meta: PaginationMeta | null;
};
