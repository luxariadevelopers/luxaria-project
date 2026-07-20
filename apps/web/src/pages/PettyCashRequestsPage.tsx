import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { applyPettyCashRequestClientFilters } from '@/petty-cash-requests/applyClientFilters';
import {
  RequestActionDialog,
  type RequestActionKind,
  type RequestActionPayload,
} from '@/petty-cash-requests/RequestActionDialog';
import {
  RequestFilters,
  type PettyCashRequestFilterState,
} from '@/petty-cash-requests/RequestFilters';
import { RequestTable } from '@/petty-cash-requests/RequestTable';
import { resolvePettyCashRequestCapabilities } from '@/petty-cash-requests/roleAccess';
import type {
  PettyCashRequirementStatus,
  PublicPettyCashRequirement,
} from '@/petty-cash-requests/types';
import {
  useCancelPettyCashRequirement,
  useClosePettyCashRequirement,
  useFinanceApprovePettyCashRequirement,
  useFundPettyCashRequirement,
  usePettyCashRequirementsList,
  usePmApprovePettyCashRequirement,
  useRejectPettyCashRequirement,
  useReturnPettyCashRequirement,
  useSubmitPettyCashRequirement,
} from '@/petty-cash-requests/usePettyCashRequests';

/**
 * Weekly petty-cash fund requests — `/accounting/petty-cash/requests`
 * (Micro Phase 048).
 *
 * Nest: `/petty-cash-requirements`
 * Permissions: `petty_cash.view|request|approve|fund`
 * Detail / create form: Phase 049 (`/new`, `/:id`).
 */
export function PettyCashRequestsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolvePettyCashRequestCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<PettyCashRequestFilterState>({
    status: '',
    weekStartDate: '',
  });
  const [actionKind, setActionKind] = useState<RequestActionKind | null>(null);
  const [actionRow, setActionRow] =
    useState<PublicPettyCashRequirement | null>(null);

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: projectId ?? undefined,
      status: (filters.status || undefined) as
        | PettyCashRequirementStatus
        | undefined,
    }),
    [page, pageSize, projectId, filters.status],
  );

  const list = usePettyCashRequirementsList(
    listQuery,
    canView && Boolean(projectId),
  );

  const submit = useSubmitPettyCashRequirement();
  const pmApprove = usePmApprovePettyCashRequirement();
  const financeApprove = useFinanceApprovePettyCashRequirement();
  const reject = useRejectPettyCashRequirement();
  const returnReq = useReturnPettyCashRequirement();
  const fund = useFundPettyCashRequirement();
  const close = useClosePettyCashRequirement();
  const cancel = useCancelPettyCashRequirement();

  const actionLoading =
    submit.isPending ||
    pmApprove.isPending ||
    financeApprove.isPending ||
    reject.isPending ||
    returnReq.isPending ||
    fund.isPending ||
    close.isPending ||
    cancel.isPending;

  const rows = useMemo(() => {
    let items = applyPettyCashRequestClientFilters(list.data?.items ?? [], {
      weekStartDate: filters.weekStartDate,
    });
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter((r) =>
        r.requestNumber.toLowerCase().includes(q),
      );
    }
    return items;
  }, [list.data?.items, filters.weekStartDate, search]);

  const openAction = (
    kind: RequestActionKind,
    row: PublicPettyCashRequirement,
  ) => {
    setActionKind(kind);
    setActionRow(row);
  };

  const closeAction = () => {
    setActionKind(null);
    setActionRow(null);
  };

  const runAction = async (payload: RequestActionPayload) => {
    if (!actionKind || !actionRow) return;
    try {
      switch (actionKind) {
        case 'submit':
          await submit.mutateAsync(actionRow.id);
          success('Request submitted for approval');
          break;
        case 'pm_approve':
          await pmApprove.mutateAsync({
            id: actionRow.id,
            input: { comment: payload.comment },
          });
          success('Project manager review completed');
          break;
        case 'finance_approve':
          await financeApprove.mutateAsync({
            id: actionRow.id,
            input: {
              comment: payload.comment,
              approvedAmount: payload.approvedAmount,
            },
          });
          success('Finance approval recorded');
          break;
        case 'reject':
          await reject.mutateAsync({
            id: actionRow.id,
            input: { comment: payload.comment },
          });
          success('Request rejected');
          break;
        case 'return':
          await returnReq.mutateAsync({
            id: actionRow.id,
            input: { comment: payload.comment },
          });
          success('Request returned for correction');
          break;
        case 'fund':
          await fund.mutateAsync({
            id: actionRow.id,
            input: { fundedAmount: payload.fundedAmount },
          });
          success('Request marked as funded');
          break;
        case 'close':
          await close.mutateAsync(actionRow.id);
          success('Request closed');
          break;
        case 'cancel':
          await cancel.mutateAsync(actionRow.id);
          success('Request cancelled');
          break;
      }
      closeAction();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Fund requests unavailable"
        message="You need the petty_cash.view permission to manage weekly funding requests."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Fund requests denied"
        message="You do not have access to petty-cash requirements for this project."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="petty-cash-requests-page">
      <Typography color="text.secondary">
        Weekly petty-cash funding requests
        {selectedProject ? ` — ${selectedProject.projectName}` : ''}.
        Submit, review, approve and fund through the Nest workflow. Previous
        unsettled cash is shown per request. Select a project in the header.
      </Typography>

      <RequestTable
        rows={rows}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={
          search.trim() || filters.weekStartDate
            ? rows.length
            : (list.data?.meta?.total ?? rows.length)
        }
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filterSlot={
          <RequestFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canRequest ? (
            <Button
              variant="contained"
              disabled={!projectId}
              onClick={() =>
                navigate('/accounting/petty-cash/requests/new')
              }
            >
              New request
            </Button>
          ) : undefined
        }
        caps={caps}
        accountLabel={(id) => `…${id.slice(-8)}`}
        onSubmit={(row) => openAction('submit', row)}
        onPmApprove={(row) => openAction('pm_approve', row)}
        onFinanceApprove={(row) => openAction('finance_approve', row)}
        onReject={(row) => openAction('reject', row)}
        onReturn={(row) => openAction('return', row)}
        onFund={(row) => openAction('fund', row)}
        onClose={(row) => openAction('close', row)}
        onCancel={(row) => openAction('cancel', row)}
      />

      <RequestActionDialog
        open={Boolean(actionKind && actionRow)}
        kind={actionKind}
        row={actionRow}
        loading={actionLoading}
        onClose={closeAction}
        onConfirm={(payload) => void runAction(payload)}
      />
    </Stack>
  );
}
