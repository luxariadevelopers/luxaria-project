import {
  searchBookings,
  searchContractors,
  searchCustomers,
  searchProjects,
  searchPurchaseOrders,
  searchPurchaseRequests,
  searchVendors,
} from '@/api/searchLists';
import type {
  QuickSearchHit,
  QuickSearchSourceDef,
  QuickSearchSourceId,
  QuickSearchSourceResult,
} from './types';
import { QUICK_SEARCH_LIMIT } from './constants';

export const QUICK_SEARCH_SOURCES: readonly QuickSearchSourceDef[] = [
  {
    id: 'projects',
    groupId: 'projects',
    groupLabel: 'Projects',
    permission: 'project.view',
    passProjectId: false,
  },
  {
    id: 'vendors',
    groupId: 'vendors',
    groupLabel: 'Vendors',
    permission: 'vendor.view',
    passProjectId: true,
  },
  {
    id: 'contractors',
    groupId: 'contractors',
    groupLabel: 'Contractors',
    permission: 'contractor.view',
    passProjectId: true,
  },
  {
    id: 'customers',
    groupId: 'customers',
    groupLabel: 'Customers',
    permission: 'customer.view',
    passProjectId: false,
  },
  {
    id: 'purchase-orders',
    groupId: 'transactions',
    groupLabel: 'Transactions',
    permission: 'purchase.view',
    passProjectId: true,
  },
  {
    id: 'purchase-requests',
    groupId: 'transactions',
    groupLabel: 'Transactions',
    permission: 'purchase.view',
    passProjectId: true,
  },
  {
    id: 'bookings',
    groupId: 'transactions',
    groupLabel: 'Transactions',
    permission: 'booking.view',
    passProjectId: true,
  },
] as const;

export type QuickSearchPermissionContext = {
  hasPermission: (permission: string) => boolean;
  bypassPermissions?: boolean;
};

/** Sources the user may query (permission filter — UX; API still enforces). */
export function filterPermittedSources(
  ctx: QuickSearchPermissionContext,
  sources: readonly QuickSearchSourceDef[] = QUICK_SEARCH_SOURCES,
): QuickSearchSourceDef[] {
  if (ctx.bypassPermissions) {
    return [...sources];
  }
  return sources.filter((source) => ctx.hasPermission(source.permission));
}

function hitPath(sourceId: QuickSearchSourceId, id: string): string {
  switch (sourceId) {
    case 'projects':
      return '/projects';
    case 'vendors':
      return `/vendors?id=${encodeURIComponent(id)}`;
    case 'contractors':
      return `/contractors?id=${encodeURIComponent(id)}`;
    case 'customers':
      return `/customers?id=${encodeURIComponent(id)}`;
    case 'purchase-orders':
      return `/procurement/purchase-orders/${encodeURIComponent(id)}`;
    case 'purchase-requests':
      return `/procurement/purchase-requests/${encodeURIComponent(id)}`;
    case 'bookings':
      return `/sales/bookings?id=${encodeURIComponent(id)}`;
  }
}

export async function runQuickSearchSource(
  source: QuickSearchSourceDef,
  query: string,
  projectId: string | null,
): Promise<QuickSearchSourceResult> {
  const params = {
    search: query,
    limit: QUICK_SEARCH_LIMIT,
    projectId:
      source.passProjectId && projectId ? projectId : undefined,
  };

  try {
    let hits: QuickSearchHit[] = [];

    switch (source.id) {
      case 'projects': {
        const rows = await searchProjects(params);
        hits = rows.map((row) => ({
          id: row.id,
          sourceId: source.id,
          groupId: source.groupId,
          title: row.projectName,
          subtitle: row.projectCode,
          status: row.status,
          path: hitPath(source.id, row.id),
          projectId: row.id,
        }));
        break;
      }
      case 'vendors': {
        const rows = await searchVendors(params);
        hits = rows.map((row) => ({
          id: row.id,
          sourceId: source.id,
          groupId: source.groupId,
          title: row.legalName,
          subtitle: row.vendorCode,
          status: row.status,
          path: hitPath(source.id, row.id),
          projectId: null,
        }));
        break;
      }
      case 'contractors': {
        const rows = await searchContractors(params);
        hits = rows.map((row) => ({
          id: row.id,
          sourceId: source.id,
          groupId: source.groupId,
          title: row.legalName,
          subtitle: row.contractorCode,
          status: row.status,
          path: hitPath(source.id, row.id),
          projectId: null,
        }));
        break;
      }
      case 'customers': {
        const rows = await searchCustomers(params);
        hits = rows.map((row) => ({
          id: row.id,
          sourceId: source.id,
          groupId: source.groupId,
          title: row.fullName,
          subtitle: row.customerCode,
          status: row.status,
          path: hitPath(source.id, row.id),
          projectId: null,
        }));
        break;
      }
      case 'purchase-orders': {
        const rows = await searchPurchaseOrders(params);
        hits = rows.map((row) => ({
          id: row.id,
          sourceId: source.id,
          groupId: source.groupId,
          title: row.purchaseOrderNumber,
          subtitle: 'Purchase order',
          status: row.status,
          path: hitPath(source.id, row.id),
          projectId: row.projectId,
        }));
        break;
      }
      case 'purchase-requests': {
        const rows = await searchPurchaseRequests(params);
        hits = rows.map((row) => ({
          id: row.id,
          sourceId: source.id,
          groupId: source.groupId,
          title: row.requestNumber,
          subtitle: 'Purchase request',
          status: row.status,
          path: hitPath(source.id, row.id),
          projectId: row.projectId,
        }));
        break;
      }
      case 'bookings': {
        const rows = await searchBookings(params);
        hits = rows.map((row) => ({
          id: row.id,
          sourceId: source.id,
          groupId: source.groupId,
          title: row.bookingNumber,
          subtitle: 'Booking',
          status: row.status,
          path: hitPath(source.id, row.id),
          projectId: row.projectId,
        }));
        break;
      }
    }

    return { sourceId: source.id, groupId: source.groupId, hits, error: null };
  } catch (error) {
    return {
      sourceId: source.id,
      groupId: source.groupId,
      hits: [],
      error,
    };
  }
}

export type QuickSearchGroup = {
  groupId: QuickSearchSourceDef['groupId'];
  label: string;
  hits: QuickSearchHit[];
  errors: unknown[];
};

export function groupQuickSearchResults(
  results: readonly QuickSearchSourceResult[],
  sources: readonly QuickSearchSourceDef[],
): QuickSearchGroup[] {
  const labelByGroup = new Map<string, string>();
  for (const source of sources) {
    labelByGroup.set(source.groupId, source.groupLabel);
  }

  const order: QuickSearchSourceDef['groupId'][] = [
    'projects',
    'vendors',
    'contractors',
    'customers',
    'transactions',
  ];

  const groups: QuickSearchGroup[] = [];
  for (const groupId of order) {
    const groupResults = results.filter((r) => r.groupId === groupId);
    if (groupResults.length === 0) {
      continue;
    }
    groups.push({
      groupId,
      label: labelByGroup.get(groupId) ?? groupId,
      hits: groupResults.flatMap((r) => r.hits),
      errors: groupResults
        .map((r) => r.error)
        .filter((e): e is NonNullable<typeof e> => e != null),
    });
  }
  return groups;
}

export function flattenHits(
  groups: readonly QuickSearchGroup[],
): QuickSearchHit[] {
  return groups.flatMap((g) => g.hits);
}
