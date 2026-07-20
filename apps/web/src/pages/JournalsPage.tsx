import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { JournalFilters } from '@/journals/JournalFilters';
import { JournalTable } from '@/journals/JournalTable';
import { JournalTotalsBar } from '@/journals/JournalTotalsBar';
import { resolveJournalCapabilities } from '@/journals/roleAccess';
import {
  useFinancialYearOptions,
  useJournalsList,
} from '@/journals/useJournals';
import {
  defaultJournalFilters,
  validateJournalFilters,
  type JournalFilterState,
} from '@/journals/validateFilters';

/**
 * Journal register — `/accounting/journals` (Micro Phase 043).
 *
 * Nest: `GET /journals` — `journal.view`
 * Filters: status, projectId, financialYearId, sourceModule, from, to.
 * No Nest free-text `search` param.
 */
export function JournalsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveJournalCapabilities(hasPermission);
  const { projects, selectedProjectId } = useProject();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<JournalFilterState>(() =>
    defaultJournalFilters(selectedProjectId ?? ''),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);

  const canView = Boolean(access) && caps.canView;
  const canViewFy = Boolean(access) && hasPermission('financial_year.view');

  const validated = useMemo(
    () => validateJournalFilters({ filters, page, limit: pageSize }),
    [filters, page, pageSize],
  );

  const list = useJournalsList(validated.api, canView && validated.ready);
  const fyQuery = useFinancialYearOptions(canView && canViewFy);

  const projectLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      map.set(
        p.id,
        p.projectCode
          ? `${p.projectCode} · ${p.projectName}`
          : p.projectName,
      );
    }
    return map;
  }, [projects]);

  const fyLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const fy of fyQuery.data ?? []) {
      map.set(fy.id, fy.name);
    }
    return map;
  }, [fyQuery.data]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Journals unavailable"
        message="You need the journal.view permission to open the journal register."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Journal list denied"
        message="You do not have permission to load journals."
      />
    );
  }

  const applyFilters = (next: JournalFilterState) => {
    setFilters(next);
    setPage(1);
  };

  const rows = list.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="journals-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography color="text.secondary">
          Searchable journal register — filter by financial year, project, source
          module, status, and date range. Trace each entry to its source module
          and entity identifiers. Posted journals are immutable.
        </Typography>
        {caps.canCreate ? (
          <Button
            variant="contained"
            onClick={() => navigate('/accounting/journals/new')}
          >
            New journal
          </Button>
        ) : null}
      </Stack>

      {!validated.ready ? (
        <>
          <JournalFilters
            value={filters}
            onChange={applyFilters}
            projects={projects}
            financialYears={fyQuery.data ?? []}
            showFinancialYear={canViewFy}
            fieldErrors={validated.fieldErrors}
          />
          <EmptyState
            title="Invalid filters"
            description="Fix the highlighted filter fields (date range must be valid; ids must be ObjectIds)."
          />
        </>
      ) : list.error ? (
        <>
          <JournalFilters
            value={filters}
            onChange={applyFilters}
            projects={projects}
            financialYears={fyQuery.data ?? []}
            showFinancialYear={canViewFy}
            fieldErrors={validated.fieldErrors}
          />
          <RetryPanel
            error={list.error}
            onRetry={() => void list.refetch()}
            forceRetry
          />
        </>
      ) : (
        <>
          <JournalTable
            rows={rows}
            loading={list.isLoading || list.isFetching}
            error={undefined}
            onRetry={() => void list.refetch()}
            page={validated.api.page ?? page}
            pageSize={validated.api.limit ?? pageSize}
            rowCount={Number(list.data?.meta?.total ?? rows.length)}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            filterSlot={
              <JournalFilters
                value={filters}
                onChange={applyFilters}
                projects={projects}
                financialYears={fyQuery.data ?? []}
                showFinancialYear={canViewFy}
                fieldErrors={validated.fieldErrors}
              />
            }
            projectLabel={(id) =>
              id ? (projectLabelById.get(id) ?? id) : 'Company'
            }
            fyLabel={(id) => fyLabelById.get(id) ?? id.slice(-6)}
            onOpen={(row) => {
              void navigate(`/accounting/journals/${row.id}`);
            }}
          />
          {rows.length > 0 ? <JournalTotalsBar rows={rows} /> : null}
        </>
      )}
    </Stack>
  );
}
