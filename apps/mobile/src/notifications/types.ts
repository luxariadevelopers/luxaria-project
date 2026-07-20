import type { InboxNotification } from '@/api/notifications';

export type { InboxNotification };

/** Mobile stack / tab targets that notifications may open. */
export type NotificationDeepLinkTarget =
  | { screen: 'DailyProgressReport' }
  | { screen: 'GoodsReceipt'; params?: { purchaseOrderId?: string } }
  | { screen: 'Tabs'; params: { screen: 'Projects' } }
  | { screen: 'ProjectSelect' };

export type ResolveDeepLinkInput = {
  entityType?: string | null;
  entityId?: string | null;
  eventType?: string | null;
  projectId?: string | null;
};

export type ResolveDeepLinkContext = {
  hasPermission: (permission: string) => boolean;
  /** Project ids the user can access (from `GET /projects`). */
  accessibleProjectIds: ReadonlySet<string>;
};

export type ResolveDeepLinkResult =
  | {
      status: 'ok';
      target: NotificationDeepLinkTarget;
      requiredPermissions: readonly string[];
      /** When set, switch active project before navigation. */
      projectId: string | null;
    }
  | {
      status: 'invalid';
      reason: string;
    }
  | {
      status: 'forbidden';
      reason: string;
      requiredPermissions: readonly string[];
    }
  | {
      status: 'none';
      reason: string;
    };
