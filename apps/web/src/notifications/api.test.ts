import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './api';

const apiGet = vi.fn();
const apiPatch = vi.fn();
const apiPost = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
}));

describe('notifications API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPatch.mockReset();
    apiPost.mockReset();
  });

  it('lists notifications with pagination meta', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [{ id: 'n1', title: 'Hello' }],
      meta: {
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      },
    });

    const result = await fetchNotifications({
      page: 2,
      limit: 20,
      unreadOnly: true,
    });

    expect(apiGet).toHaveBeenCalledWith('/notifications', {
      page: 2,
      limit: 20,
      unreadOnly: true,
    });
    expect(result.items).toHaveLength(1);
    expect(result.meta?.total).toBe(45);
    expect(result.meta?.hasNextPage).toBe(true);
  });

  it('derives unread count from unreadOnly meta.total', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [],
      meta: {
        page: 1,
        limit: 1,
        total: 7,
        totalPages: 7,
        hasNextPage: true,
        hasPrevPage: false,
      },
    });

    await expect(fetchUnreadNotificationCount()).resolves.toBe(7);
    expect(apiGet).toHaveBeenCalledWith('/notifications', {
      unreadOnly: true,
      page: 1,
      limit: 1,
    });
  });

  it('marks one and all as read', async () => {
    apiPatch.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { id: 'n1', isRead: true },
    });
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { modifiedCount: 3 },
    });

    await expect(markNotificationRead('n1')).resolves.toMatchObject({
      id: 'n1',
      isRead: true,
    });
    expect(apiPatch).toHaveBeenCalledWith('/notifications/n1/read');

    await expect(markAllNotificationsRead()).resolves.toBe(3);
    expect(apiPost).toHaveBeenCalledWith('/notifications/read-all');
  });
});
