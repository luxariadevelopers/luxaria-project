import {
  clampListLimit,
  clampListPage,
} from '@/components/data-table/listQuery';
import { PurchaseOrderStatus } from './types';
import type { ListPurchaseOrdersQuery } from './types';

export type PurchaseOrderFilterState = {
  status: string;
  search: string;
  vendorId: string;
  purchaseRequestId: string;
};

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const STATUS_SET = new Set<string>(Object.values(PurchaseOrderStatus));

export type ValidatedPurchaseOrderQuery = {
  api: ListPurchaseOrdersQuery;
  fieldErrors: Partial<Record<keyof PurchaseOrderFilterState, string>>;
  ready: boolean;
};

/**
 * Validate list filters against Nest `ListPurchaseOrdersQueryDto`.
 * Status must be a backend `PurchaseOrderStatus` enum value.
 */
export function validatePurchaseOrderFilters(input: {
  filters: PurchaseOrderFilterState;
  page: number;
  limit: number;
  projectId: string;
}): ValidatedPurchaseOrderQuery {
  const fieldErrors: Partial<Record<keyof PurchaseOrderFilterState, string>> =
    {};
  const { filters } = input;
  const api: ListPurchaseOrdersQuery = {
    page: clampListPage(input.page),
    limit: clampListLimit(input.limit),
  };

  const projectId = input.projectId.trim();
  if (!OBJECT_ID_RE.test(projectId)) {
    return {
      api,
      fieldErrors: { ...fieldErrors },
      ready: false,
    };
  }
  api.projectId = projectId;

  if (filters.status.trim()) {
    if (!STATUS_SET.has(filters.status.trim())) {
      fieldErrors.status = 'Unsupported purchase order status';
    } else {
      api.status = filters.status.trim() as PurchaseOrderStatus;
    }
  }

  if (filters.vendorId.trim()) {
    if (!OBJECT_ID_RE.test(filters.vendorId.trim())) {
      fieldErrors.vendorId = 'Vendor id must be a 24-character ObjectId';
    } else {
      api.vendorId = filters.vendorId.trim();
    }
  }

  if (filters.purchaseRequestId.trim()) {
    if (!OBJECT_ID_RE.test(filters.purchaseRequestId.trim())) {
      fieldErrors.purchaseRequestId =
        'Purchase request id must be a 24-character ObjectId';
    } else {
      api.purchaseRequestId = filters.purchaseRequestId.trim();
    }
  }

  const search = filters.search.trim();
  if (search) {
    api.search = search;
  }

  return {
    api,
    fieldErrors,
    ready: Object.keys(fieldErrors).length === 0,
  };
}

export function defaultPurchaseOrderFilters(): PurchaseOrderFilterState {
  return {
    status: '',
    search: '',
    vendorId: '',
    purchaseRequestId: '',
  };
}
