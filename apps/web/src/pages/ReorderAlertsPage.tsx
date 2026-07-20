import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { AlertTable } from '@/reorder-alerts/AlertTable';
import { compareAlertsBySeverity } from '@/reorder-alerts/alertSeverity';
import { ForecastAssumptionsBanner } from '@/reorder-alerts/ForecastAssumptionsBanner';
import {
  ReorderAlertFilters,
  type ReorderAlertFilterState,
} from '@/reorder-alerts/ReorderAlertFilters';
import { resolveReorderAlertCapabilities } from '@/reorder-alerts/roleAccess';
import type {
  PublicStockReorderAlert,
  StockReorderAlertStatus,
  StockReorderAlertType,
} from '@/reorder-alerts/types';
import { StockReorderAlertStatus as AlertStatus } from '@/reorder-alerts/types';
import {
  useEvaluateStockReorder,
  useReorderAlertsList,
  useStockForecast,
} from '@/reorder-alerts/useReorderAlerts';

/**
 * Reorder / stock-out alerts — `/inventory/reorder-alerts` (Micro Phase 074).
 *
 * Nest: `GET /stock-reorder/alerts`, `GET /stock-reorder/forecast` (`stock.view`).
 * Optional refresh: `POST /stock-reorder/evaluate` (`stock.adjust`).
 */
export function ReorderAlertsPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveReorderAlertCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState<ReorderAlertFilterState>({
    status: AlertStatus.Open,
    alertType: '',
  });

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      status: (filters.status || undefined) as
        | StockReorderAlertStatus
        | undefined,
      alertType: (filters.alertType || undefined) as
        | StockReorderAlertType
        | undefined,
    }),
    [page, pageSize, selectedProjectId, filters.status, filters.alertType],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useReorderAlertsList(listQuery, enabled);
  const forecast = useStockForecast(
    { projectId: selectedProjectId ?? '' },
    enabled,
  );
  const evaluate = useEvaluateStockReorder();

  const rows = useMemo(() => {
    const items = [...(list.data?.items ?? [])];
    items.sort(compareAlertsBySeverity);
    return items;
  }, [list.data?.items]);

  const latestEvaluatedAt = useMemo(() => {
    let latest: string | null = null;
    for (const row of list.data?.items ?? []) {
      if (!row.evaluatedAt) continue;
      if (!latest || row.evaluatedAt > latest) {
        latest = row.evaluatedAt;
      }
    }
    return latest;
  }, [list.data?.items]);

  const lookbackDays = forecast.data?.[0]?.lookbackDays ?? null;

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Reorder alerts unavailable"
        message="You need the stock.view permission to see stock forecasts and reorder alerts. (Phase alias stock_forecast.view is not in the Nest catalog.)"
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to review reorder alerts."
      />
    );
  }

  const runEvaluate = () => {
    void (async () => {
      try {
        const outcome = await evaluate.mutateAsync({
          projectId: selectedProjectId,
        });
        success(
          outcome.mode === 'queued'
            ? 'Reorder evaluation queued'
            : 'Reorder evaluation completed',
        );
        await list.refetch();
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  const createPo = (row: PublicStockReorderAlert) => {
    navigate(
      `/procurement/purchase-orders/new?materialId=${encodeURIComponent(row.materialId)}&recommendedQty=${encodeURIComponent(String(row.recommendedPurchaseQuantity))}`,
    );
  };

  return (
    <Stack spacing={2} data-testid="reorder-alerts-page">
      <Typography color="text.secondary">
        Actionable stock-out forecast so purchase users can replenish before
        material shortages.
      </Typography>

      <ForecastAssumptionsBanner
        dataTimestamp={latestEvaluatedAt}
        lookbackDays={lookbackDays}
      />

      <AlertTable
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
        filterSlot={
          <ReorderAlertFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canEvaluate ? (
            <Button
              variant="outlined"
              onClick={runEvaluate}
              disabled={evaluate.isPending}
            >
              {evaluate.isPending ? 'Evaluating…' : 'Run evaluation'}
            </Button>
          ) : undefined
        }
        caps={caps}
        onCreatePurchaseOrder={
          caps.canCreatePurchaseOrder ? createPo : undefined
        }
      />
    </Stack>
  );
}
