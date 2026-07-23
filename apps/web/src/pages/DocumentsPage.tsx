import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack } from '@mui/material';
import { listEntityDocuments } from '@/api/documents';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { DocumentLibraryFilters } from '@/documents/DocumentLibraryFilters';
import { DocumentTable } from '@/documents/DocumentTable';
import {
  defaultDocumentLibraryFilters,
  validateDocumentLibraryFilters,
  type DocumentLibraryFilterState,
} from '@/documents/validateLibraryFilters';

/**
 * Searchable document library (`/documents`).
 *
 * Nest `GET /documents` requires `entityType` + `entityId` — there is no
 * global document index. S3 keys are never rendered; downloads use
 * `GET /documents/:id/download-url`.
 */
export function DocumentsPage() {
  const { hasPermission, access } = useAuth();
  const { projects, selectedProjectId } = useProject();
  const [filters, setFilters] = useState<DocumentLibraryFilterState>(() =>
    defaultDocumentLibraryFilters(selectedProjectId ?? ''),
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIST_PAGE_SIZE);

  const canView = Boolean(access) && hasPermission('document.view');

  const validated = useMemo(
    () =>
      validateDocumentLibraryFilters({
        filters,
        page,
        limit,
      }),
    [filters, page, limit],
  );

  const listQuery = useQuery({
    queryKey: ['documents', 'library', validated.api],
    queryFn: async () => {
      const result = await listEntityDocuments(validated.api!);
      return {
        items: result.items,
        meta: result.meta,
      };
    },
    enabled: canView && validated.ready && validated.api != null,
    staleTime: 15_000,
    retry: false,
  });

  const visibleRows = useMemo(() => {
    const items = listQuery.data?.items ?? [];
    const q = filters.search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (doc) =>
        doc.originalFileName.toLowerCase().includes(q) ||
        doc.documentCode.toLowerCase().includes(q) ||
        doc.documentType.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q),
    );
  }, [listQuery.data?.items, filters.search]);

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Documents unavailable"
        message="You need the document.view permission to open the document library."
      />
    );
  }

  const listError = listQuery.error;
  if (listError && isForbiddenError(listError)) {
    return (
      <PermissionDenied
        error={listError}
        title="Document list denied"
        message="You do not have access to documents for this entity or project."
      />
    );
  }

  const applyFilters = (next: DocumentLibraryFilterState) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Documents"
        subtitle="Find permitted documents by entity. Downloads use private, time-limited URLs — object storage keys are never exposed in this UI."
      />

      {!validated.ready ? (
        <>
          <DocumentLibraryFilters
            value={filters}
            projects={projects}
            fieldErrors={validated.fieldErrors}
            onChange={applyFilters}
          />
          <EmptyState
            title="Choose an entity"
            description="Enter a valid entity type and Mongo ObjectId to load documents. The list API is entity-scoped."
          />
        </>
      ) : listError ? (
        <>
          <DocumentLibraryFilters
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
        <DocumentTable
          rows={visibleRows}
          loading={listQuery.isLoading}
          error={undefined}
          onRetry={() => void listQuery.refetch()}
          page={validated.api?.page ?? page}
          pageSize={validated.api?.limit ?? limit}
          rowCount={
            filters.search.trim()
              ? visibleRows.length
              : Number(listQuery.data?.meta?.total ?? visibleRows.length)
          }
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
          onArchived={() => void listQuery.refetch()}
          filterSlot={
            <DocumentLibraryFilters
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
