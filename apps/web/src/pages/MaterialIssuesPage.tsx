import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { AttachSignatureDialog } from '@/material-issues/AttachSignatureDialog';
import { IssueForm } from '@/material-issues/IssueForm';
import { PageHeader } from '@/layouts/PageHeader';
import {
  MaterialIssueFilters,
  type MaterialIssueFilterState,
} from '@/material-issues/MaterialIssueFilters';
import { MaterialIssueTable } from '@/material-issues/MaterialIssueTable';
import { resolveMaterialIssueCapabilities } from '@/material-issues/roleAccess';
import { ReturnForm } from '@/material-issues/ReturnForm';
import type {
  MaterialIssueStatus,
  PublicMaterialIssue,
} from '@/material-issues/types';
import {
  useCancelMaterialIssue,
  useConfirmMaterialIssue,
  useMaterialIssuesList,
  useSubmitMaterialIssue,
} from '@/material-issues/useMaterialIssues';

/**
 * Material issues list — `/inventory/material-issues` (Micro Phase 073).
 *
 * Nest: `GET /material-issues` (`stock.view`).
 * Create/submit/return: `stock.issue`. Confirm: `stock.adjust`.
 */
export function MaterialIssuesPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveMaterialIssueCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<MaterialIssueFilterState>({
    status: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [returnTarget, setReturnTarget] =
    useState<PublicMaterialIssue | null>(null);
  const [signatureTarget, setSignatureTarget] =
    useState<PublicMaterialIssue | null>(null);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      projectId: selectedProjectId ?? undefined,
      status: (filters.status || undefined) as
        | MaterialIssueStatus
        | undefined,
    }),
    [page, pageSize, search, selectedProjectId, filters.status],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useMaterialIssuesList(listQuery, enabled);
  const submit = useSubmitMaterialIssue();
  const confirm = useConfirmMaterialIssue();
  const cancel = useCancelMaterialIssue();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Material issues unavailable"
        message="You need the stock.view permission to review material issues. (Phase alias material_issue.view is not in the Nest catalog.)"
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list material issues."
      />
    );
  }

  const openDetail = (row: PublicMaterialIssue) => {
    navigate(`/inventory/material-issues/${row.id}`);
  };

  const run = (
    action: () => Promise<unknown>,
    okMessage: string,
  ) => {
    void (async () => {
      try {
        await action();
        success(okMessage);
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <Stack spacing={2} data-testid="material-issues-page">
      <PageHeader
        subtitle="Issue materials to work against a BOQ item, capture recipient signature, confirm to reduce stock, and post returns from work."
      />

      <MaterialIssueTable
        rows={list.data?.items ?? []}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? list.data?.items.length ?? 0}
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
          <MaterialIssueFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New issue
            </Button>
          ) : undefined
        }
        caps={caps}
        onOpenDetail={openDetail}
        onAttachSignature={setSignatureTarget}
        onSubmit={(row) =>
          run(() => submit.mutateAsync(row.id), 'Material issue submitted')
        }
        onConfirm={(row) =>
          run(
            () => confirm.mutateAsync(row.id),
            'Material issue confirmed; stock reduced',
          )
        }
        onReturn={setReturnTarget}
        onCancel={(row) =>
          run(() => cancel.mutateAsync(row.id), 'Material issue cancelled')
        }
      />

      <IssueForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
        canViewBoq={caps.canViewBoq}
        canViewMaterials={caps.canViewMaterials}
        canViewUsers={caps.canViewUsers}
        canViewStock={caps.canViewStock}
        onCreated={(id) => navigate(`/inventory/material-issues/${id}`)}
      />

      <ReturnForm
        open={Boolean(returnTarget)}
        onClose={() => setReturnTarget(null)}
        issue={returnTarget}
        onReturned={() => void list.refetch()}
      />

      <AttachSignatureDialog
        open={Boolean(signatureTarget)}
        onClose={() => setSignatureTarget(null)}
        issue={signatureTarget}
        canUpload={caps.canUploadDocuments}
        canDownload={caps.canDownloadDocuments}
        onAttached={() => void list.refetch()}
      />
    </Stack>
  );
}
