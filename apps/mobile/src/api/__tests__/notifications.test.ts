import {
  fetchUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
  unregisterPushToken,
} from '../notifications';

const apiGet = jest.fn();
const apiPatch = jest.fn();
const apiPost = jest.fn();
const apiPut = jest.fn();
const apiDelete = jest.fn();

jest.mock('../client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPut: (...args: unknown[]) => apiPut(...args),
  apiDelete: (...args: unknown[]) => apiDelete(...args),
}));

describe('mobile notifications API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPatch.mockReset();
    apiPost.mockReset();
    apiPut.mockReset();
    apiDelete.mockReset();
  });

  it('lists notifications with pagination meta', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [{ id: 'n1', title: 'Hello', isRead: false }],
      meta: {
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      },
    });

    const result = await listNotifications({
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

  it('updates preferences via PUT and unregisters push tokens with body', async () => {
    apiPut.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { userId: 'u1', muted: true, events: [] },
    });
    apiDelete.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { removed: true },
    });

    await updateNotificationPreferences({ muted: true });
    expect(apiPut).toHaveBeenCalledWith('/notifications/preferences', {
      muted: true,
    });

    await unregisterPushToken('ExponentPushToken[abc]');
    expect(apiDelete).toHaveBeenCalledWith('/notifications/push-tokens', {
      data: { token: 'ExponentPushToken[abc]' },
    });
  });
});
