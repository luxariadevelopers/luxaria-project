import { useEffect, useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PageHeader } from '@/layouts/PageHeader';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { POFilters } from '@/purchase-orders/POFilters';
import { POTable } from '@/purchase-orders/POTable';
import { resolvePurchaseOrderCapabilities } from '@/purchase-orders/roleAccess';
import { PURCHASE_ORDER_ROUTES } from '@/purchase-orders/routes';
import { usePurchaseOrdersList } from '@/purchase-orders/usePurchaseOrders';
import {
  defaultPurchaseOrderFilters,
  validatePurchaseOrderFilters,
  type PurchaseOrderFilterState,
} from '@/purchase-orders/validateFilters';

/**
 * Purchase order pipeline list — `/procurement/purchase-orders` (Micro Phase 065).
 *
 * Nest: `GET /purchase-orders` — `purchase.view`
 *
 * Create form (066): `PURCHASE_ORDER_ROUTES.create` + `caps.canCreate`
 * Detail (067): `PURCHASE_ORDER_ROUTES.detail(id)` + `POTable.onOpenDetail`
 */
export function PurchaseOrdersPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolvePurchaseOrderCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get('id');

  const [filters, setFilters] = useState<PurchaseOrderFilterState>(() =>
    defaultPurchaseOrderFilters(),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);

  const canView = Boolean(access) && caps.canView;

  /** Quick-search / legacy `?id=` → detail deep link (Micro Phase 067). */
  useEffect(() => {
    if (deepLinkId && /^[a-fA-F0-9]{24}$/.test(deepLinkId)) {
      navigate(PURCHASE_ORDER_ROUTES.detail(deepLinkId), { replace: true });
    }
  }, [deepLinkId, navigate]);

  const validated = useMemo(
    () =>
      validatePurchaseOrderFilters({
        filters,
        page,
        limit: pageSize,
        projectId: selectedProjectId ?? '',
      }),
    [filters, page, pageSize, selectedProjectId],
  );

  const list = usePurchaseOrdersList(
    validated.api,
    canView && validated.ready && Boolean(selectedProjectId),
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Purchase orders unavailable"
        message="You need the purchase.view permission to monitor purchase orders."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list purchase orders."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Purchase order list denied"
        message="You do not have permission to load purchase orders."
      />
    );
  }

  const applyFilters = (next: PurchaseOrderFilterState) => {
    setFilters(next);
    setPage(1);
  };

  const rows = list.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="purchase-orders-page">
      <PageHeader
        subtitle="Monitor purchase orders for the active project — delivery status, received value, and open balance. Open a row for full lifecycle and revisions."
        actions={
          caps.canCreate ? (
            <Button
              variant="contained"
              onClick={() => navigate(PURCHASE_ORDER_ROUTES.create)}
            >
              New purchase order
            </Button>
          ) : undefined
        }
      />

      {!validated.ready ? (
        <>
          <POFilters
            value={filters}
            onChange={applyFilters}
            fieldErrors={validated.fieldErrors}
          />
          <EmptyState
            title="Invalid filters"
            description="Fix the highlighted filter fields. Status must match a Nest purchase order status."
          />
        </>
      ) : list.error ? (
        <>
          <POFilters
            value={filters}
            onChange={applyFilters}
            fieldErrors={validated.fieldErrors}
          />
          <RetryPanel
            error={list.error}
            onRetry={() => void list.refetch()}
            forceRetry
          />
        </>
      ) : (
        <POTable
          rows={rows}
          loading={list.isLoading || list.isFetching}
          error={list.error}
          onRetry={() => void list.refetch()}
          page={page}
          pageSize={pageSize}
          rowCount={list.data?.meta?.total ?? rows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          search={filters.search}
          onSearchChange={(value) => {
            applyFilters({ ...filters, search: value });
          }}
          filterSlot={
            <POFilters
              value={filters}
              onChange={applyFilters}
              fieldErrors={validated.fieldErrors}
            />
          }
          caps={caps}
          onOpenDetail={(row) =>
            navigate(PURCHASE_ORDER_ROUTES.detail(row.id))
          }
        />
      )}
    </Stack>
  );
}
