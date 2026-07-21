import { useMemo, useState } from 'react';
import { Stack, Tab, Tabs, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  GstDocumentFilters,
  GstReturnFilters,
  type GstDocumentFilterState,
  type GstReturnFilterState,
} from './GstFilters';
import { GstDocumentTable, GstReturnTable } from './GstTable';
import { resolveGstCapabilities } from './roleAccess';
import { useGstDocumentsList, useGstReturnsList } from './useGst';

type TabValue = 'documents' | 'returns';

export function GstListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveGstCapabilities(hasPermission);
  const { projects, selectedProjectId } = useProject();

  const [tab, setTab] = useState<TabValue>('documents');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [docFilters, setDocFilters] = useState<GstDocumentFilterState>(() => ({
    projectId: selectedProjectId ?? '',
    direction: '',
    status: '',
    documentType: '',
    from: '',
    to: '',
  }));
  const [retFilters, setRetFilters] = useState<GstReturnFilterState>({
    returnType: '',
    periodMonth: '',
    periodYear: '',
  });

  const canView = Boolean(access) && caps.canView;

  const docQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: docFilters.projectId || undefined,
      direction: docFilters.direction || undefined,
      status: docFilters.status || undefined,
      documentType: docFilters.documentType || undefined,
      from: docFilters.from || undefined,
      to: docFilters.to || undefined,
    }),
    [page, pageSize, docFilters],
  );

  const retQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      returnType: retFilters.returnType || undefined,
      periodMonth: retFilters.periodMonth ? Number(retFilters.periodMonth) : undefined,
      periodYear: retFilters.periodYear ? Number(retFilters.periodYear) : undefined,
    }),
    [page, pageSize, retFilters],
  );

  const documents = useGstDocumentsList(docQuery, canView && tab === 'documents');
  const returns = useGstReturnsList(retQuery, canView && tab === 'returns');

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="GST unavailable"
        message="You need the gst.view permission to browse GST documents and returns."
      />
    );
  }

  const activeQuery = tab === 'documents' ? documents : returns;

  if (activeQuery.error && isForbiddenError(activeQuery.error)) {
    return (
      <PermissionDenied
        error={activeQuery.error}
        title="GST list denied"
        message="You do not have permission to load GST data."
      />
    );
  }

  const docRows = documents.data?.items ?? [];
  const retRows = returns.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="gst-page">
      <Typography color="text.secondary">
        GST documents (inward / outward) and periodic returns (GSTR-1, 3B, 2B).
      </Typography>

      <Tabs value={tab} onChange={(_e, v: TabValue) => { setTab(v); setPage(1); }}>
        <Tab value="documents" label="Documents" />
        <Tab value="returns" label="Returns" />
      </Tabs>

      {tab === 'documents' ? (
        documents.error ? (
          <>
            <GstDocumentFilters value={docFilters} onChange={setDocFilters} projects={projects} />
            <RetryPanel error={documents.error} onRetry={() => void documents.refetch()} forceRetry />
          </>
        ) : (
          <GstDocumentTable
            rows={docRows}
            loading={documents.isLoading || documents.isFetching}
            page={page}
            pageSize={pageSize}
            rowCount={Number(documents.data?.meta?.total ?? docRows.length)}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            filterSlot={
              <GstDocumentFilters
                value={docFilters}
                onChange={(next) => { setDocFilters(next); setPage(1); }}
                projects={projects}
              />
            }
          />
        )
      ) : returns.error ? (
        <>
          <GstReturnFilters value={retFilters} onChange={setRetFilters} />
          <RetryPanel error={returns.error} onRetry={() => void returns.refetch()} forceRetry />
        </>
      ) : (
        <GstReturnTable
          rows={retRows}
          loading={returns.isLoading || returns.isFetching}
          page={page}
          pageSize={pageSize}
          rowCount={Number(returns.data?.meta?.total ?? retRows.length)}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          filterSlot={
            <GstReturnFilters
              value={retFilters}
              onChange={(next) => { setRetFilters(next); setPage(1); }}
            />
          }
        />
      )}
    </Stack>
  );
}
