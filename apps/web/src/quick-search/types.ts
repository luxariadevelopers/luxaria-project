import type { PermissionCode } from '@/navigation/permissionCatalog';

export type QuickSearchGroupId =
  | 'projects'
  | 'vendors'
  | 'contractors'
  | 'customers'
  | 'transactions';

export type QuickSearchSourceId =
  | 'projects'
  | 'vendors'
  | 'contractors'
  | 'customers'
  | 'purchase-orders'
  | 'purchase-requests'
  | 'bookings';

export type QuickSearchHit = {
  id: string;
  sourceId: QuickSearchSourceId;
  groupId: QuickSearchGroupId;
  /** Primary line (name or transaction number). */
  title: string;
  /** Secondary line (code / status). */
  subtitle: string;
  status: string | null;
  /** Absolute app path registered in the navigation registry. */
  path: string;
  /** When set, activate this project in ProjectContext before navigate. */
  projectId: string | null;
};

export type QuickSearchSourceResult = {
  sourceId: QuickSearchSourceId;
  groupId: QuickSearchGroupId;
  hits: QuickSearchHit[];
  error: unknown | null;
};

export type QuickSearchSourceDef = {
  id: QuickSearchSourceId;
  groupId: QuickSearchGroupId;
  groupLabel: string;
  /** Catalog permission required to query this source. */
  permission: PermissionCode;
  /** When true, pass selected `projectId` to the list API if available. */
  passProjectId: boolean;
};
