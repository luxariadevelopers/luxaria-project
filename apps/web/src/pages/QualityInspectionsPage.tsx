import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { CancelInspectionDialog } from '@/quality-inspections/CancelInspectionDialog';
import { InspectionForm } from '@/quality-inspections/InspectionForm';
import { PageHeader } from '@/layouts/PageHeader';
import {
  QualityInspectionFilters,
  type QualityInspectionFilterState,
} from '@/quality-inspections/QualityInspectionFilters';
import { QualityInspectionTable } from '@/quality-inspections/QualityInspectionTable';
import { resolveQualityInspectionCapabilities } from '@/quality-inspections/roleAccess';
import { ResultActions } from '@/quality-inspections/ResultActions';
import type {
  PublicQualityInspection,
  QualityInspectionResult,
  QualityInspectionStatus,
} from '@/quality-inspections/types';
import {
  useInspectableGrns,
  useQualityInspectionsList,
} from '@/quality-inspections/useQualityInspections';

/**
 * Quality inspections list (Micro Phase 069).
 * Route: `/inventory/quality-inspections`
 */
export function QualityInspectionsPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveQualityInspectionCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<QualityInspectionFilterState>({
    status: '',
    result: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [resultTarget, setResultTarget] =
    useState<PublicQualityInspection | null>(null);
  const [cancelTarget, setCancelTarget] =
    useState<PublicQualityInspection | null>(null);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      search: search.trim() || undefined,
      status: (filters.status || undefined) as
        | QualityInspectionStatus
        | undefined,
      result: (filters.result || undefined) as
        | QualityInspectionResult
        | undefined,
    }),
    [page, pageSize, selectedProjectId, search, filters.status, filters.result],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const inspectionsQuery = useQualityInspectionsList(listQuery, enabled);
  const grnsQuery = useInspectableGrns(
    selectedProjectId,
    enabled && caps.canInspect,
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Quality inspections unavailable"
        message="You need the quality.view permission to review material quality inspections."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list quality inspections."
      />
    );
  }

  const openDetail = (row: PublicQualityInspection) => {
    navigate(`/inventory/quality-inspections/${row.id}`);
  };

  return (
    <Stack spacing={2} data-testid="quality-inspections-page">
      <PageHeader
        subtitle="Review and record material quality decisions against goods receipts. Completing an inspection updates the GRN and vendor quality score."
      />

      <QualityInspectionTable
        rows={inspectionsQuery.data?.items ?? []}
        loading={inspectionsQuery.isLoading}
        error={inspectionsQuery.error}
        onRetry={() => void inspectionsQuery.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={inspectionsQuery.data?.meta?.total ?? 0}
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
          <QualityInspectionFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canInspect ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New inspection
            </Button>
          ) : undefined
        }
        caps={caps}
        onOpenDetail={openDetail}
        onComplete={setResultTarget}
        onCancel={setCancelTarget}
      />

      <InspectionForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        grns={grnsQuery.data ?? []}
        grnsLoading={grnsQuery.isLoading}
        grnsError={grnsQuery.error}
        onRetryGrns={() => void grnsQuery.refetch()}
        onCreated={(id) => navigate(`/inventory/quality-inspections/${id}`)}
      />

      <ResultActions
        open={Boolean(resultTarget)}
        onClose={() => setResultTarget(null)}
        inspection={resultTarget}
        onCompleted={() => void inspectionsQuery.refetch()}
      />

      <CancelInspectionDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        inspection={cancelTarget}
        onCancelled={() => void inspectionsQuery.refetch()}
      />
    </Stack>
  );
}
