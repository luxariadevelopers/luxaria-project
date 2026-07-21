import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DetailHeader } from '@/components/entity-detail';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate, formatDateTime } from '@/format';
import {
  FINANCIAL_YEAR_LIST_PAGE_SIZE,
  FINANCIAL_YEAR_ROUTE_BASE,
} from './constants';
import { FinancialYearStatusChip } from './FinancialYearStatusChip';
import {
  LifecycleConfirmationDialog,
  type FinancialYearLifecycleAction,
} from './LifecycleConfirmationDialog';
import { resolveFinancialYearCapabilities } from './permissions';
import {
  UnlockRequestStatus,
  type PublicFinancialYearUnlockRequest,
} from './types';
import {
  RequestUnlockDialog,
  UnlockDecisionDialog,
  type UnlockDecision,
} from './UnlockDialogs';
import { UnlockRequestHistory } from './UnlockRequestHistory';
import {
  useApproveFinancialYearUnlock,
  useFinancialYearCompany,
  useFinancialYearDetail,
  useFinancialYearUnlockRequests,
  useLockFinancialYear,
  useRejectFinancialYearUnlock,
  useRequestFinancialYearUnlock,
  useSetCurrentFinancialYear,
} from './useFinancialYears';

type Props = {
  financialYearId?: string;
};

export function FinancialYearDetailPage({
  financialYearId: financialYearIdProp,
}: Props = {}) {
  const params = useParams<{ financialYearId: string }>();
  const financialYearId = financialYearIdProp ?? params.financialYearId;
  const { user, access, hasPermission } = useAuth();
  const notify = useNotify();
  const capabilities = resolveFinancialYearCapabilities(hasPermission);
  const canView = Boolean(access) && capabilities.canView;

  const detailQuery = useFinancialYearDetail(financialYearId, canView);
  const financialYear = detailQuery.data;
  const companyLookupId =
    financialYear?.companyId ?? user?.companyId ?? null;
  const companyQuery = useFinancialYearCompany(
    companyLookupId,
    canView && Boolean(financialYear) && hasPermission('company.view'),
  );

  const [unlockPage, setUnlockPage] = useState(1);
  const [unlockPageSize, setUnlockPageSize] = useState(
    FINANCIAL_YEAR_LIST_PAGE_SIZE,
  );
  const [unlockStatus, setUnlockStatus] =
    useState<UnlockRequestStatus | ''>('');
  const unlockListRequest = useMemo(
    () => ({
      page: unlockPage,
      limit: unlockPageSize,
      status: unlockStatus || undefined,
    }),
    [unlockPage, unlockPageSize, unlockStatus],
  );
  const unlockQuery = useFinancialYearUnlockRequests(
    financialYearId,
    unlockListRequest,
    canView,
  );
  const pendingUnlockQuery = useFinancialYearUnlockRequests(
    financialYearId,
    {
      page: 1,
      limit: 1,
      status: UnlockRequestStatus.Pending,
    },
    canView && Boolean(financialYear?.isLocked),
  );
  const hasPendingUnlockRequest =
    (pendingUnlockQuery.data?.meta.total ?? 0) > 0;

  const setCurrentMutation = useSetCurrentFinancialYear();
  const lockMutation = useLockFinancialYear();
  const requestUnlockMutation = useRequestFinancialYearUnlock();
  const approveUnlockMutation = useApproveFinancialYearUnlock();
  const rejectUnlockMutation = useRejectFinancialYearUnlock();

  const [lifecycleAction, setLifecycleAction] =
    useState<FinancialYearLifecycleAction | null>(null);
  const [lifecycleError, setLifecycleError] = useState<unknown>();
  const [requestUnlockOpen, setRequestUnlockOpen] = useState(false);
  const [requestUnlockError, setRequestUnlockError] = useState<unknown>();
  const [decision, setDecision] = useState<UnlockDecision>('approve');
  const [decisionTarget, setDecisionTarget] =
    useState<PublicFinancialYearUnlockRequest | null>(null);
  const [decisionError, setDecisionError] = useState<unknown>();

  if (!access || (canView && detailQuery.isLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !capabilities.canView ||
    (detailQuery.error && isForbiddenError(detailQuery.error))
  ) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Financial year unavailable"
        message="You need the financial_year.view permission to view this financial year."
      />
    );
  }

  if (detailQuery.error || !financialYear) {
    return (
      <RetryPanel
        error={detailQuery.error ?? new Error('Financial year not found')}
        onRetry={() => void detailQuery.refetch()}
        forceRetry
      />
    );
  }

  const companyName =
    companyQuery.data?.tradeName?.trim() ||
    companyQuery.data?.legalName?.trim() ||
    companyQuery.data?.companyCode ||
    (financialYear.companyId === user?.companyId
      ? 'Authenticated company'
      : financialYear.companyId || 'Primary company');

  const runLifecycleAction = async () => {
    if (!lifecycleAction) return;
    setLifecycleError(undefined);
    try {
      if (lifecycleAction === 'set-current') {
        await setCurrentMutation.mutateAsync(financialYear.id);
        notify.success(`${financialYear.name} is now the current year`);
      } else {
        await lockMutation.mutateAsync(financialYear.id);
        notify.success(`${financialYear.name} locked successfully`);
      }
      setLifecycleAction(null);
    } catch (error) {
      setLifecycleError(error);
      notify.error(getErrorMessage(error));
    }
  };

  const submitUnlockRequest = async (input: { reason: string }) => {
    setRequestUnlockError(undefined);
    try {
      await requestUnlockMutation.mutateAsync({
        financialYearId: financialYear.id,
        input,
      });
      setRequestUnlockOpen(false);
      notify.success('Unlock request submitted for separate approval');
    } catch (error) {
      setRequestUnlockError(error);
      notify.error(getErrorMessage(error));
    }
  };

  const openDecision = (
    nextDecision: UnlockDecision,
    request: PublicFinancialYearUnlockRequest,
  ) => {
    setDecision(nextDecision);
    setDecisionTarget(request);
    setDecisionError(undefined);
  };

  const approveUnlock = async (input: { approvalNote?: string | null }) => {
    if (!decisionTarget) return;
    setDecisionError(undefined);
    try {
      await approveUnlockMutation.mutateAsync({
        financialYearId: financialYear.id,
        requestId: decisionTarget.id,
        input,
      });
      setDecisionTarget(null);
      notify.success(`${financialYear.name} unlocked successfully`);
    } catch (error) {
      // Includes the server-enforced requester/approver separation error.
      setDecisionError(error);
      notify.error(getErrorMessage(error));
    }
  };

  const rejectUnlock = async (input: { rejectionReason: string }) => {
    if (!decisionTarget) return;
    setDecisionError(undefined);
    try {
      await rejectUnlockMutation.mutateAsync({
        financialYearId: financialYear.id,
        requestId: decisionTarget.id,
        input,
      });
      setDecisionTarget(null);
      notify.success('Unlock request rejected; financial year remains locked');
    } catch (error) {
      setDecisionError(error);
      notify.error(getErrorMessage(error));
    }
  };

  const mutationPending =
    setCurrentMutation.isPending || lockMutation.isPending;

  return (
    <Stack spacing={2.5} data-testid="financial-year-detail-page">
      <DetailHeader
        title={financialYear.name}
        subtitle={`${formatDate(financialYear.startDate)} – ${formatDate(financialYear.endDate)}`}
        backTo={FINANCIAL_YEAR_ROUTE_BASE}
        backLabel="Financial years"
        meta={<FinancialYearStatusChip financialYear={financialYear} />}
      />

      {companyQuery.error ? (
        <Alert severity="info" variant="outlined">
          The optional read-only company label lookup is unavailable. The
          financial year remains scoped to company id{' '}
          {financialYear.companyId ?? 'primary'}.
        </Alert>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            divider={<Divider flexItem orientation="vertical" />}
          >
            <Stack spacing={0.25} sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary">
                Company
              </Typography>
              <Typography>{companyName}</Typography>
            </Stack>
            <Stack spacing={0.25} sx={{ minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">
                Current-year state
              </Typography>
              <Typography>
                {financialYear.isCurrent ? 'Current' : 'Not current'}
              </Typography>
            </Stack>
            <Stack spacing={0.25} sx={{ minWidth: 220 }}>
              <Typography variant="caption" color="text.secondary">
                Lock state
              </Typography>
              <Typography>
                {financialYear.isLocked
                  ? `Locked${financialYear.lockedAt ? ` on ${formatDateTime(financialYear.lockedAt)}` : ''}`
                  : 'Unlocked'}
              </Typography>
              {financialYear.lockedBy ? (
                <Typography variant="caption" color="text.secondary">
                  By user {financialYear.lockedBy}
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          {capabilities.canManage ? (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              {!financialYear.isCurrent ? (
                <Button
                  variant="outlined"
                  disabled={financialYear.isLocked}
                  onClick={() => {
                    setLifecycleError(undefined);
                    setLifecycleAction('set-current');
                  }}
                >
                  Set as current
                </Button>
              ) : null}
              {!financialYear.isLocked ? (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => {
                    setLifecycleError(undefined);
                    setLifecycleAction('lock');
                  }}
                >
                  Lock financial year
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  disabled={
                    pendingUnlockQuery.isLoading ||
                    hasPendingUnlockRequest
                  }
                  onClick={() => {
                    setRequestUnlockError(undefined);
                    setRequestUnlockOpen(true);
                  }}
                >
                  {hasPendingUnlockRequest
                    ? 'Unlock request pending'
                    : 'Request unlock'}
                </Button>
              )}
            </Stack>
          ) : (
            <Alert severity="info" variant="outlined">
              Lifecycle actions require financial_year.manage.
            </Alert>
          )}

          {financialYear.isLocked && !financialYear.isCurrent ? (
            <Alert severity="warning" variant="outlined">
              Locked years cannot be made current. Submit an unlock request;
              approval must use financial_year.unlock.
            </Alert>
          ) : null}
          {hasPendingUnlockRequest ? (
            <Alert severity="info" variant="outlined">
              A pending unlock request already exists. It must be approved or
              rejected before another request can be submitted.
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      {unlockQuery.error && isForbiddenError(unlockQuery.error) ? (
        <PermissionDenied
          error={unlockQuery.error}
          title="Unlock history denied"
          message="The server denied access to this financial year’s unlock history."
          showHomeLink={false}
        />
      ) : (
        <UnlockRequestHistory
          rows={unlockQuery.data?.items ?? []}
          loading={unlockQuery.isLoading || unlockQuery.isFetching}
          error={unlockQuery.error}
          page={unlockPage}
          pageSize={unlockPageSize}
          rowCount={unlockQuery.data?.meta.total ?? 0}
          status={unlockStatus}
          currentUserId={user?.id}
          canDecide={capabilities.canApproveUnlock}
          onStatusChange={(nextStatus) => {
            setUnlockStatus(nextStatus);
            setUnlockPage(1);
          }}
          onPageChange={setUnlockPage}
          onPageSizeChange={(nextSize) => {
            setUnlockPageSize(nextSize);
            setUnlockPage(1);
          }}
          onRetry={() => void unlockQuery.refetch()}
          onApprove={(request) => openDecision('approve', request)}
          onReject={(request) => openDecision('reject', request)}
        />
      )}

      <LifecycleConfirmationDialog
        open={Boolean(lifecycleAction)}
        action={lifecycleAction ?? 'lock'}
        financialYear={financialYear}
        loading={mutationPending}
        error={lifecycleError}
        onConfirm={runLifecycleAction}
        onClose={() => {
          if (!mutationPending) {
            setLifecycleAction(null);
            setLifecycleError(undefined);
          }
        }}
      />

      <RequestUnlockDialog
        open={requestUnlockOpen}
        financialYear={financialYear}
        loading={requestUnlockMutation.isPending}
        error={requestUnlockError}
        onSubmit={submitUnlockRequest}
        onClose={() => {
          if (!requestUnlockMutation.isPending) {
            setRequestUnlockOpen(false);
            setRequestUnlockError(undefined);
          }
        }}
      />

      <UnlockDecisionDialog
        open={Boolean(decisionTarget)}
        decision={decision}
        request={decisionTarget}
        currentUserId={user?.id}
        loading={
          approveUnlockMutation.isPending || rejectUnlockMutation.isPending
        }
        error={decisionError}
        onApprove={approveUnlock}
        onReject={rejectUnlock}
        onClose={() => {
          if (
            !approveUnlockMutation.isPending &&
            !rejectUnlockMutation.isPending
          ) {
            setDecisionTarget(null);
            setDecisionError(undefined);
          }
        }}
      />
    </Stack>
  );
}
