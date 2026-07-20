import { useEffect, useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { ApprovalStatus } from '@luxaria/shared-types';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { useProject } from '@/context/ProjectContext';
import {
  ApprovalFilters,
  type ApprovalFilterState,
} from '@/approvals/ApprovalFilters';
import { ApprovalSummaryChips } from '@/approvals/ApprovalSummaryChips';
import {
  ApprovalTable,
  approvalFiltersToPreferenceValues,
} from '@/approvals/ApprovalTable';
import {
  applyApprovalClientFilters,
  hasApprovalClientFilters,
} from '@/approvals/applyClientFilters';
import {
  useApprovalsList,
  usePendingApprovalCount,
} from '@/approvals/useApprovals';
import {
  defaultApprovalInboxFilters,
  validateApprovalInboxFilters,
} from '@/approvals/validateFilters';
import { isForbiddenError } from '@/api/errors';

const CLIENT_FILTER_FETCH_LIMIT = 100;

export function ApprovalsPage() {
  const { hasPermission, access } = useAuth();
  const {
    selectedProjectId,
    selectedProject,
    projects,
    setSelectedProjectId,
  } = useProject();

  const [filters, setFilters] = useState<ApprovalFilterState>(() =>
    defaultApprovalInboxFilters(selectedProjectId ?? ''),
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIST_PAGE_SIZE);

  const canView = Boolean(access) && hasPermission('approval.view');

  // Keep project filter in sync with header selection.
  useEffect(() => {
    if (selectedProjectId && filters.projectId !== selectedProjectId) {
      setFilters((prev) => ({ ...prev, projectId: selectedProjectId }));
      setPage(1);
    }
  }, [selectedProjectId, filters.projectId]);

  const validated = useMemo(
    () =>
      validateApprovalInboxFilters({
        filters,
        page,
        limit,
      }),
    [filters, page, limit],
  );

  const clientActive = hasApprovalClientFilters(validated.client);

  const listApiQuery = useMemo(() => {
    if (clientActive) {
      return {
        ...validated.api,
        page: 1,
        limit: CLIENT_FILTER_FETCH_LIMIT,
      };
    }
    return validated.api;
  }, [validated.api, clientActive]);

  const projectIdForApi =
    filters.projectId.trim() || selectedProjectId || null;

  const listQuery = useApprovalsList(projectIdForApi, listApiQuery, canView);
  const pendingQuery = usePendingApprovalCount(projectIdForApi, canView);

  const moduleOptions = useMemo(() => {
    const modules = new Set(
      (listQuery.data?.items ?? []).map((item) => item.module),
    );
    if (filters.module) {
      modules.add(filters.module);
    }
    return [...modules].sort((a, b) => a.localeCompare(b));
  }, [listQuery.data?.items, filters.module]);

  const filteredItems = useMemo(
    () =>
      applyApprovalClientFilters(
        listQuery.data?.items ?? [],
        validated.client,
      ),
    [listQuery.data?.items, validated.client],
  );

  const tableRows = useMemo(() => {
    if (!clientActive) {
      return filteredItems;
    }
    const start = (validated.api.page - 1) * validated.api.limit;
    return filteredItems.slice(start, start + validated.api.limit);
  }, [clientActive, filteredItems, validated.api.page, validated.api.limit]);

  const rowCount = clientActive
    ? filteredItems.length
    : (listQuery.data?.meta?.total ?? filteredItems.length);

  const applyFilters = (next: ApprovalFilterState) => {
    setFilters(next);
    setPage(1);
    if (next.projectId && next.projectId !== selectedProjectId) {
      setSelectedProjectId(next.projectId);
    }
  };

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Approvals unavailable"
        message="You need the approval.view permission to open the approval inbox."
      />
    );
  }

  if (!projectIdForApi) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header or project filter to load approval requests. Approvals are project-scoped on the API."
      />
    );
  }

  const listError = listQuery.error;
  const denied = listError != null && isForbiddenError(listError);

  if (denied) {
    return (
      <PermissionDenied
        error={listError}
        title="Project approvals denied"
        message="You do not have access to approvals for this project."
      />
    );
  }

  const pending = pendingQuery.data ?? 0;
  const clientFilterHint = clientActive
    ? `Amount and ageing are client-side only (API has no amount/ageing query). Filtering up to ${CLIENT_FILTER_FETCH_LIMIT} rows from the current server query.`
    : null;

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        {selectedProject
          ? `${selectedProject.projectCode} · `
          : null}
        Work queue for requests in the selected project
        {filters.status === ApprovalStatus.Pending
          ? ' (default: pending)'
          : null}
        .
      </Typography>

      <ApprovalSummaryChips
        pendingTotal={pending}
        visibleRows={tableRows}
        listTotal={
          clientActive ? filteredItems.length : (listQuery.data?.meta?.total ?? null)
        }
        statusFilter={filters.status}
        ageingFilter={filters.ageing}
        onSelectStatus={(status) => applyFilters({ ...filters, status })}
        onSelectAgeing={(ageing) => applyFilters({ ...filters, ageing })}
      />

      {listQuery.error && !denied ? (
        <RetryPanel
          error={listQuery.error}
          onRetry={() => void listQuery.refetch()}
          forceRetry
        />
      ) : (
        <ApprovalTable
          rows={tableRows}
          loading={listQuery.isLoading}
          error={undefined}
          onRetry={() => void listQuery.refetch()}
          page={validated.api.page}
          pageSize={validated.api.limit}
          rowCount={rowCount}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
          filterSlot={
            <ApprovalFilters
              value={filters}
              projects={projects}
              moduleOptions={moduleOptions}
              fieldErrors={validated.fieldErrors}
              clientFilterHint={clientFilterHint}
              onChange={applyFilters}
            />
          }
          filterValues={approvalFiltersToPreferenceValues(filters)}
          onApplySavedQuery={(saved) => {
            applyFilters({
              ...filters,
              status: saved.filters.status ?? '',
              module: saved.filters.module ?? '',
              entityType: saved.filters.entityType ?? '',
              minAmount: saved.filters.minAmount ?? '',
              maxAmount: saved.filters.maxAmount ?? '',
              ageing: saved.filters.ageing ?? '',
            });
            setLimit(saved.limit);
            setPage(1);
          }}
          onResetPreferences={() => {
            applyFilters(defaultApprovalInboxFilters(projectIdForApi));
            setLimit(DEFAULT_LIST_PAGE_SIZE);
            setPage(1);
          }}
        />
      )}

      {Object.keys(validated.fieldErrors).length > 0 ? (
        <Alert severity="warning" variant="outlined">
          Some filters were ignored because they are unsupported or invalid.
        </Alert>
      ) : null}
    </Stack>
  );
}
