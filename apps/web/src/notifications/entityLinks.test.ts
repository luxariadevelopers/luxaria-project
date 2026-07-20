import { describe, expect, it } from 'vitest';
import {
  isMongoObjectId,
  resolveNotificationEntityLink,
} from './entityLinks';
import { NotificationEventType } from './eventTypes';
import type { PublicNotification } from './types';

function notification(
  overrides: Partial<PublicNotification>,
): PublicNotification {
  return {
    id: '507f1f77bcf86cd799439011',
    eventType: NotificationEventType.ApprovalPending,
    title: 'Test',
    body: 'Body',
    data: {},
    channels: ['in_app'],
    isRead: false,
    readAt: null,
    projectId: null,
    entityType: null,
    entityId: null,
    createdAt: '2026-07-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('notification entity deep links', () => {
  it('validates mongo object ids', () => {
    expect(isMongoObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isMongoObjectId('not-an-id')).toBe(false);
    expect(isMongoObjectId(null)).toBe(false);
  });

  it('resolves DPR links when permission and ids are valid', () => {
    const link = resolveNotificationEntityLink(
      notification({
        eventType: NotificationEventType.MissingDpr,
        entityType: 'dpr',
        entityId: '507f1f77bcf86cd799439012',
        projectId: '507f1f77bcf86cd799439013',
      }),
      { hasAnyPermission: (perms) => perms.includes('dpr.view') },
    );

    expect(link).toEqual({
      to: '/daily-progress-reports',
      label: 'Open daily progress',
      projectId: '507f1f77bcf86cd799439013',
      requiresProject: true,
    });
  });

  it('falls back to eventType when entityType is absent', () => {
    const link = resolveNotificationEntityLink(
      notification({
        eventType: NotificationEventType.MissingDpr,
      }),
      { hasAnyPermission: () => true },
    );
    expect(link?.to).toBe('/daily-progress-reports');
  });

  it('rejects malformed entity ids', () => {
    const link = resolveNotificationEntityLink(
      notification({
        eventType: NotificationEventType.MissingDpr,
        entityType: 'dpr',
        entityId: 'bad',
      }),
      { hasAnyPermission: () => true },
    );
    expect(link).toBeNull();
  });

  it('rejects when entity permission is missing', () => {
    const link = resolveNotificationEntityLink(
      notification({
        eventType: NotificationEventType.MissingDpr,
        entityType: 'project',
        entityId: '507f1f77bcf86cd799439012',
      }),
      { hasAnyPermission: () => false },
    );
    expect(link).toBeNull();
  });

  it('returns null for unmapped entity types', () => {
    const link = resolveNotificationEntityLink(
      notification({
        eventType: NotificationEventType.LowStock,
        entityType: 'stock_item',
        entityId: '507f1f77bcf86cd799439012',
      }),
      { hasAnyPermission: () => true },
    );
    expect(link).toBeNull();
  });
});
