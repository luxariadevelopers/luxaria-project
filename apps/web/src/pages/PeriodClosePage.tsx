import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { useNotify } from '@/components/NotificationProvider';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { ApproveReopenDialog } from '@/period-close/ApproveReopenDialog';
import { BlockingIssuesPanel } from '@/period-close/BlockingIssuesPanel';
import {
  blockingChecklistItems,
  canLockPeriod,
} from '@/period-close/canLockPeriod';
import { ClosingChecklist } from '@/period-close/ClosingChecklist';
import { CreatePeriodDrawer } from '@/period-close/CreatePeriodDrawer';
import { periodDisplayLabel } from '@/period-close/labels';
import { LockPeriodDialog } from '@/period-close/LockPeriodDialog';
import {
  PeriodFilters,
  type PeriodFilterState,
} from '@/period-close/PeriodFilters';
import { PeriodReopenHistory } from '@/period-close/PeriodReopenHistory';
import { PeriodStatusChip } from '@/period-close/PeriodStatusChip';
import { PeriodTable } from '@/period-close/PeriodTable';
import { RejectReopenDialog } from '@/period-close/RejectReopenDialog';
import { ReopenRequestDialog } from '@/period-close/ReopenRequestDialog';
import { resolvePeriodCloseCapabilities } from '@/period-close/roleAccess';
import {
  AccountingPeriodStatus,
  type PublicAccountingPeriod,
  type PublicPeriodReopenRequest,
} from '@/period-close/types';
import {
  useAccountingPeriodDetail,
  useAccountingPeriodsList,
  useCloseAccountingPeriod,
  usePeriodCloseFinancialYears,
  usePeriodReopenRequests,
  useRunPreCloseValidation,
} from '@/period-close/usePeriodClose';

/**
 * Period closure — `/accounting/period-close` (Micro Phase 055).
 *
 * Nest: `/accounting-period-closure/periods…`
 * Permissions: `period_closure.view|manage|reopen|approve_reopen`
 * (not `period_close.*`). Company/FY scoped — `projectScope: none`.
 */
export function PeriodClosePage() {
  const { hasPermission, access } = useAuth();
  const caps = resolvePeriodCloseCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [filters, setFilters] = useState<PeriodFilterState>({
    financialYearId: '',
    periodType: '',
    status: '',
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [approveTarget, setApproveTarget] =
    useState<PublicPeriodReopenRequest | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<PublicPeriodReopenRequest | null>(null);

  const canView = Boolean(access) && caps.canView;
  const canViewFy = Boolean(access) && hasPermission('financial_year.view');

  const listQuery = useMemo(
    () => ({
      financialYearId: filters.financialYearId || undefined,
      periodType: filters.periodType || undefined,
      status: filters.status || undefined,
    }),
    [filters],
  );

  const list = useAccountingPeriodsList(listQuery, canView);
  const fyQuery = usePeriodCloseFinancialYears(canView && canViewFy);
  const detail = useAccountingPeriodDetail(selectedId, canView);
  const reopenList = usePeriodReopenRequests(selectedId, canView);

  const validateMut = useRunPreCloseValidation();
  const closeMut = useCloseAccountingPeriod();

  const rows = useMemo(() => list.data ?? [], [list.data]);
  const selected: PublicAccountingPeriod | null =
    detail.data ?? rows.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && rows.length > 0) {
      setSelectedId(rows[0]!.id);
    }
  }, [rows, selectedId]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Period closure unavailable"
        message="You need the period_closure.view permission to open accounting period closure."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Period list denied"
        message="You do not have permission to load accounting periods."
      />
    );
  }

  const failedItems = blockingChecklistItems(selected);
  const lockGate = canLockPeriod(selected);
  const isOpen = selected?.status === AccountingPeriodStatus.Open;
  const isLockedOrClosed =
    selected?.status === AccountingPeriodStatus.Locked ||
    selected?.status === AccountingPeriodStatus.Closed;

  const onValidate = async () => {
    if (!selected) return;
    try {
      const result = await validateMut.mutateAsync(selected.id);
      if (result.validationPassed) {
        success('Pre-close validation passed');
      } else {
        notifyError(
          `Pre-close validation failed (${result.failedCount} item(s))`,
        );
      }
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const onClosePeriod = async () => {
    if (!selected) return;
    try {
      await closeMut.mutateAsync(selected.id);
      success('Accounting period closed');
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Stack spacing={2} data-testid="period-close-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box>
          <Typography variant="h5">Period Closure</Typography>
          <Typography variant="body2" color="text.secondary">
            Monthly and financial-year close, lock, and exceptional reopen.
          </Typography>
        </Box>
        {caps.canManage ? (
          <Button
            variant="contained"
            onClick={() => setCreateOpen(true)}
            disabled={!canViewFy || (fyQuery.data?.length ?? 0) === 0}
          >
            Create period
          </Button>
        ) : null}
      </Stack>

      <PeriodFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setSelectedId(null);
        }}
        financialYears={fyQuery.data ?? []}
        showFinancialYear={canViewFy}
      />

      {list.isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Stack>
      ) : list.error ? (
        <RetryPanel
          error={list.error}
          onRetry={() => void list.refetch()}
          forceRetry
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No accounting periods"
          description="Create a monthly or financial-year period, then run pre-close validation before locking."
        />
      ) : (
        <PeriodTable
          rows={rows}
          selectedId={selectedId}
          onSelect={(row) => setSelectedId(row.id)}
        />
      )}

      {selectedId && detail.error && isForbiddenError(detail.error) ? (
        <PermissionDenied
          error={detail.error}
          title="Period detail denied"
          message="You do not have permission to view this period."
        />
      ) : null}

      {selectedId && detail.error && !isForbiddenError(detail.error) ? (
        <RetryPanel
          error={detail.error}
          onRetry={() => void detail.refetch()}
          forceRetry
        />
      ) : null}

      {selected ? (
        <Stack spacing={2} data-testid="period-close-detail">
          <Divider />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{
              justifyContent: 'space-between',
              alignItems: { md: 'center' },
            }}
          >
            <Stack spacing={0.5}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <Typography variant="h6">
                  {periodDisplayLabel(selected)}
                </Typography>
                <PeriodStatusChip status={selected.status} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {selected.periodNumber}
                {selected.validationPassed
                  ? ' · Validation passed'
                  : ' · Validation incomplete'}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              {caps.canManage && isOpen ? (
                <Button
                  variant="outlined"
                  onClick={() => void onValidate()}
                  disabled={validateMut.isPending}
                  data-testid="run-preclose-validation"
                >
                  {validateMut.isPending ? 'Validating…' : 'Run validation'}
                </Button>
              ) : null}
              {caps.canLock && isOpen ? (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => setLockOpen(true)}
                  disabled={!lockGate.ok}
                  data-testid="open-lock-dialog"
                >
                  Lock period
                </Button>
              ) : null}
              {caps.canManage &&
              selected.status === AccountingPeriodStatus.Locked ? (
                <Button
                  variant="contained"
                  onClick={() => void onClosePeriod()}
                  disabled={closeMut.isPending}
                >
                  {closeMut.isPending ? 'Closing…' : 'Close period'}
                </Button>
              ) : null}
              {caps.canReopen && isLockedOrClosed ? (
                <Button
                  variant="outlined"
                  onClick={() => setReopenOpen(true)}
                  data-testid="open-reopen-dialog"
                >
                  Request reopen
                </Button>
              ) : null}
            </Stack>
          </Stack>

          {!lockGate.ok && isOpen ? (
            <Alert severity="warning" variant="outlined">
              {lockGate.reason}
            </Alert>
          ) : null}

          <ClosingChecklist
            items={selected.checklist ?? []}
            validationRunAt={selected.validationRunAt}
            validationPassed={selected.validationPassed}
          />

          <BlockingIssuesPanel failedItems={failedItems} />

          {reopenList.error && !isForbiddenError(reopenList.error) ? (
            <RetryPanel
              error={reopenList.error}
              onRetry={() => void reopenList.refetch()}
              forceRetry
            />
          ) : (
            <PeriodReopenHistory
              rows={reopenList.data ?? []}
              canApprove={caps.canApproveReopen}
              onApprove={setApproveTarget}
              onReject={setRejectTarget}
            />
          )}
        </Stack>
      ) : null}

      <CreatePeriodDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        financialYears={fyQuery.data ?? []}
      />
      <LockPeriodDialog
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        period={selected}
      />
      <ReopenRequestDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        period={selected}
      />
      <ApproveReopenDialog
        open={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        periodId={selectedId}
        request={approveTarget}
      />
      <RejectReopenDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        periodId={selectedId}
        request={rejectTarget}
      />
    </Stack>
  );
}
