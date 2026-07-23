import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack } from '@mui/material';
import { listAuditLogs } from '@/api/audit-logs';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { AuditFilters } from '@/audit-logs/AuditFilters';
import { AuditTable } from '@/audit-logs/AuditTable';
import { sanitizeAuditEntries } from '@/audit-logs/sanitizeAuditEntry';
import {
  defaultAuditLogFilters,
  validateAuditLogFilters,
  type AuditLogFilterState,
} from '@/audit-logs/validateFilters';

/**
 * Administration audit log viewer — `/administration/audit-logs`.
 * Permission: `audit.view`. Immutable / read-only.
 */
export function AuditLogsPage() {
  const { hasPermission, access } = useAuth();
  const { projects, selectedProjectId } = useProject();
  const [filters, setFilters] = useState<AuditLogFilterState>(() =>
    defaultAuditLogFilters(selectedProjectId ?? ''),
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIST_PAGE_SIZE);

  const canView = Boolean(access) && hasPermission('audit.view');

  const validated = useMemo(
    () => validateAuditLogFilters({ filters, page, limit }),
    [filters, page, limit],
  );

  const listQuery = useQuery({
    queryKey: ['audit-logs', 'admin', validated.api],
    queryFn: async () => {
      const result = await listAuditLogs(validated.api);
      return {
        items: sanitizeAuditEntries(result.items),
        meta: result.meta,
      };
    },
    // Invalid filter values are omitted from `api` — still query with the rest.
    enabled: canView,
    staleTime: 15_000,
    retry: false,
  });

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Audit logs unavailable"
        message="You need the audit.view permission to open the audit log viewer."
      />
    );
  }

  const listError = listQuery.error;
  if (listError && isForbiddenError(listError)) {
    return (
      <PermissionDenied
        error={listError}
        title="Audit query denied"
        message="You do not have access to these audit logs."
      />
    );
  }

  const applyFilters = (next: AuditLogFilterState) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Audit logs"
        subtitle="Trace immutable changes by actor, module, entity, and request id. This screen has no create, update, or delete actions."
      />

      {listError && !isForbiddenError(listError) ? (
        <>
          <AuditFilters
            value={filters}
            projects={projects}
            fieldErrors={validated.fieldErrors}
            onChange={applyFilters}
          />
          <RetryPanel
            error={listError}
            onRetry={() => void listQuery.refetch()}
            forceRetry
          />
        </>
      ) : (
        <AuditTable
          rows={listQuery.data?.items ?? []}
          loading={listQuery.isLoading}
          error={undefined}
          onRetry={() => void listQuery.refetch()}
          page={validated.api.page ?? page}
          pageSize={validated.api.limit ?? limit}
          rowCount={Number(
            listQuery.data?.meta?.total ?? listQuery.data?.items.length ?? 0,
          )}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
          filterSlot={
            <AuditFilters
              value={filters}
              projects={projects}
              fieldErrors={validated.fieldErrors}
              onChange={applyFilters}
            />
          }
        />
      )}
    </Stack>
  );
}
