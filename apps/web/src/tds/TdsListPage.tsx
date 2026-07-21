import { useMemo, useState } from 'react';
import { Stack, Tab, Tabs, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  TdsDeductionFilters,
  TdsReturnFilters,
  type TdsDeductionFilterState,
  type TdsReturnFilterState,
} from './TdsFilters';
import { TdsDeductionTable, TdsReturnTable } from './TdsTable';
import { resolveTdsCapabilities } from './roleAccess';
import { useTdsDeductionsList, useTdsReturnsList } from './useTds';

type TabValue = 'deductions' | 'returns';

export function TdsListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveTdsCapabilities(hasPermission);
  const { projects, selectedProjectId } = useProject();

  const [tab, setTab] = useState<TabValue>('deductions');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [dedFilters, setDedFilters] = useState<TdsDeductionFilterState>(() => ({
    projectId: selectedProjectId ?? '',
    sectionCode: '',
    status: '',
    from: '',
    to: '',
  }));
  const [retFilters, setRetFilters] = useState<TdsReturnFilterState>({
    formType: '',
    quarter: '',
    financialYearLabel: '',
    status: '',
  });

  const canView = Boolean(access) && caps.canView;

  const dedQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: dedFilters.projectId || undefined,
      sectionCode: dedFilters.sectionCode.trim() || undefined,
      status: dedFilters.status || undefined,
      from: dedFilters.from || undefined,
      to: dedFilters.to || undefined,
    }),
    [page, pageSize, dedFilters],
  );

  const retQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      formType: retFilters.formType || undefined,
      quarter: retFilters.quarter || undefined,
      financialYearLabel: retFilters.financialYearLabel.trim() || undefined,
      status: retFilters.status || undefined,
    }),
    [page, pageSize, retFilters],
  );

  const deductions = useTdsDeductionsList(dedQuery, canView && tab === 'deductions');
  const returns = useTdsReturnsList(retQuery, canView && tab === 'returns');

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="TDS unavailable"
        message="You need the tds.view permission to browse TDS deductions and returns."
      />
    );
  }

  const activeQuery = tab === 'deductions' ? deductions : returns;

  if (activeQuery.error && isForbiddenError(activeQuery.error)) {
    return (
      <PermissionDenied
        error={activeQuery.error}
        title="TDS list denied"
        message="You do not have permission to load TDS data."
      />
    );
  }

  const dedRows = deductions.data?.items ?? [];
  const retRows = returns.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="tds-page">
      <Typography color="text.secondary">
        TDS deductions by section and quarterly returns (26Q / 24Q / 27Q).
      </Typography>

      <Tabs value={tab} onChange={(_e, v: TabValue) => { setTab(v); setPage(1); }}>
        <Tab value="deductions" label="Deductions" />
        <Tab value="returns" label="Returns" />
      </Tabs>

      {tab === 'deductions' ? (
        deductions.error ? (
          <>
            <TdsDeductionFilters value={dedFilters} onChange={setDedFilters} projects={projects} />
            <RetryPanel error={deductions.error} onRetry={() => void deductions.refetch()} forceRetry />
          </>
        ) : (
          <TdsDeductionTable
            rows={dedRows}
            loading={deductions.isLoading || deductions.isFetching}
            page={page}
            pageSize={pageSize}
            rowCount={Number(deductions.data?.meta?.total ?? dedRows.length)}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            filterSlot={
              <TdsDeductionFilters
                value={dedFilters}
                onChange={(next) => { setDedFilters(next); setPage(1); }}
                projects={projects}
              />
            }
          />
        )
      ) : returns.error ? (
        <>
          <TdsReturnFilters value={retFilters} onChange={setRetFilters} />
          <RetryPanel error={returns.error} onRetry={() => void returns.refetch()} forceRetry />
        </>
      ) : (
        <TdsReturnTable
          rows={retRows}
          loading={returns.isLoading || returns.isFetching}
          page={page}
          pageSize={pageSize}
          rowCount={Number(returns.data?.meta?.total ?? retRows.length)}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          filterSlot={
            <TdsReturnFilters
              value={retFilters}
              onChange={(next) => { setRetFilters(next); setPage(1); }}
            />
          }
        />
      )}
    </Stack>
  );
}
