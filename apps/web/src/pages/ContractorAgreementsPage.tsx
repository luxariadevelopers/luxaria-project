import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { AgreementDocumentPanel } from '@/contractor-agreements/AgreementDocumentPanel';
import {
  AgreementFilters,
  type AgreementFilterState,
} from '@/contractor-agreements/AgreementFilters';
import {
  AgreementFormDrawer,
  type AgreementEntryMode,
} from '@/contractor-agreements/AgreementFormDrawer';
import { AgreementTable } from '@/contractor-agreements/AgreementTable';
import { AmendAgreementDialog } from '@/contractor-agreements/AmendAgreementDialog';
import { ExpiryAlertsBanner } from '@/contractor-agreements/ExpiryAlertsBanner';
import { RejectAgreementDialog } from '@/contractor-agreements/RejectAgreementDialog';
import { TerminateAgreementDialog } from '@/contractor-agreements/TerminateAgreementDialog';
import { resolveContractorAgreementCapabilities } from '@/contractor-agreements/roleAccess';
import type {
  ContractorAgreementStatus,
  PublicContractorAgreement,
} from '@/contractor-agreements/types';
import {
  useApproveContractorAgreement,
  useContractorAgreementsList,
  useContractorOptions,
  useExpiryAlerts,
  useSubmitContractorAgreement,
} from '@/contractor-agreements/useContractorAgreements';

/**
 * Contractor agreements list — `/contractors/agreements` (Micro Phase 089).
 */
export function ContractorAgreementsPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveContractorAgreementCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<AgreementFilterState>({
    status: '',
    contractorId: '',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<AgreementEntryMode>('create');
  const [activeRow, setActiveRow] = useState<PublicContractorAgreement | null>(
    null,
  );
  const [docOpen, setDocOpen] = useState(false);
  const [rejectTarget, setRejectTarget] =
    useState<PublicContractorAgreement | null>(null);
  const [terminateTarget, setTerminateTarget] =
    useState<PublicContractorAgreement | null>(null);
  const [amendTarget, setAmendTarget] =
    useState<PublicContractorAgreement | null>(null);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      contractorId: filters.contractorId || undefined,
      status: (filters.status || undefined) as
        | ContractorAgreementStatus
        | undefined,
      agreementNumber: search.trim() || undefined,
    }),
    [
      page,
      pageSize,
      selectedProjectId,
      filters.contractorId,
      filters.status,
      search,
    ],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useContractorAgreementsList(listQuery, enabled);
  const alerts = useExpiryAlerts(
    {
      projectId: selectedProjectId ?? undefined,
      unacknowledgedOnly: true,
      limit: 10,
    },
    enabled,
  );
  const contractors = useContractorOptions('', enabled);
  const submit = useSubmitContractorAgreement();
  const approve = useApproveContractorAgreement();

  const contractorLabel = (contractorId: string) => {
    const match = contractors.data?.find((c) => c.id === contractorId);
    return match?.label ?? contractorId.slice(-6);
  };

  const openDrawer = (
    mode: AgreementEntryMode,
    row: PublicContractorAgreement | null = null,
  ) => {
    setDrawerMode(mode);
    setActiveRow(row);
    setDrawerOpen(true);
  };

  const openDetail = (row: PublicContractorAgreement) => {
    navigate(`/contractors/agreements/${row.id}`);
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied message="Missing permission contractor_agreement.view" />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Contractor agreements are project-scoped. Choose an active project to continue."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Contractor agreements</Typography>
      <Typography color="text.secondary">
        Versioned commercial agreements between Luxaria and contractors for the
        active project.
      </Typography>

      <ExpiryAlertsBanner
        alerts={alerts.data?.items ?? []}
        canManage={caps.canManage}
        onOpenAgreement={(alert) =>
          navigate(`/contractors/agreements/${alert.agreementId}`)
        }
      />

      <AgreementTable
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        search={search}
        onSearchChange={setSearch}
        filterSlot={
          <AgreementFilters
            value={filters}
            onChange={setFilters}
            contractorOptions={contractors.data ?? []}
          />
        }
        toolbarActions={
          caps.canManage ? (
            <Button variant="contained" onClick={() => openDrawer('create')}>
              New agreement
            </Button>
          ) : null
        }
        caps={caps}
        contractorLabel={contractorLabel}
        onOpenDetail={openDetail}
        onEdit={(row) => openDrawer('edit', row)}
        onAttachDocument={(row) => {
          setActiveRow(row);
          setDocOpen(true);
        }}
        onSubmit={async (row) => {
          try {
            await submit.mutateAsync(row.id);
            success('Agreement submitted for approval');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onApprove={async (row) => {
          try {
            await approve.mutateAsync({ id: row.id });
            success('Agreement approved');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onReject={(row) => setRejectTarget(row)}
        onAmend={(row) => setAmendTarget(row)}
        onTerminate={(row) => setTerminateTarget(row)}
      />

      <AgreementFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        projectId={selectedProjectId}
        agreement={activeRow}
        canManage={caps.canManage}
        onSaved={openDetail}
      />

      <AgreementDocumentPanel
        open={docOpen}
        onClose={() => setDocOpen(false)}
        projectId={selectedProjectId}
        agreement={activeRow}
        canUpload={caps.canManage}
      />

      <RejectAgreementDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        agreement={rejectTarget}
      />

      <TerminateAgreementDialog
        open={Boolean(terminateTarget)}
        onClose={() => setTerminateTarget(null)}
        agreement={terminateTarget}
      />

      <AmendAgreementDialog
        open={Boolean(amendTarget)}
        onClose={() => setAmendTarget(null)}
        agreement={amendTarget}
        versions={[]}
        onAmended={(draft) => navigate(`/contractors/agreements/${draft.id}`)}
      />
    </Stack>
  );
}
