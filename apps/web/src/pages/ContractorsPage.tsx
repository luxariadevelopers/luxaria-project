import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { BlockContractorDialog } from '@/contractors/BlockContractorDialog';
import { CreateContractorDrawer } from '@/contractors/CreateContractorDrawer';
import { PageHeader } from '@/layouts/PageHeader';
import {
  ContractorFilters,
  type ContractorFilterState,
} from '@/contractors/ContractorFilters';
import { ContractorTable } from '@/contractors/ContractorTable';
import { EditContractorDrawer } from '@/contractors/EditContractorDrawer';
import { resolveContractorCapabilities } from '@/contractors/roleAccess';
import type {
  ContractorListRow,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from '@/contractors/types';
import {
  useActivateContractor,
  useBlockContractor,
  useContractorsList,
  useVerifyContractor,
} from '@/contractors/useContractors';

/**
 * Contractor master list — `/contractors`.
 * Nest: GET/POST /contractors, verify/activate/block.
 */
export function ContractorsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveContractorCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ContractorFilterState>({
    status: '',
    verificationStatus: '',
    contractorType: '',
    workCategory: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ContractorListRow | null>(null);
  const [blockTarget, setBlockTarget] = useState<ContractorListRow | null>(
    null,
  );

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: (filters.status || undefined) as ContractorStatus | undefined,
      verificationStatus: (filters.verificationStatus || undefined) as
        | ContractorVerificationStatus
        | undefined,
      contractorType: (filters.contractorType || undefined) as
        | ContractorType
        | undefined,
      workCategory: filters.workCategory.trim() || undefined,
    }),
    [page, pageSize, search, filters],
  );

  const contractorsQuery = useContractorsList(listQuery, caps.canView);
  const verify = useVerifyContractor();
  const activate = useActivateContractor();
  const block = useBlockContractor();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Contractors unavailable"
        message="You need the contractor.view permission to manage contractors."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        subtitle="Contractor master — search, verification, activation, and blocking. Bank account numbers are never shown in this list."
      />

      <ContractorTable
        rows={contractorsQuery.data?.items ?? []}
        loading={contractorsQuery.isLoading || contractorsQuery.isFetching}
        error={contractorsQuery.error}
        onRetry={() => void contractorsQuery.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={contractorsQuery.data?.meta?.total ?? 0}
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
          <ContractorFilters
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
              New contractor
            </Button>
          ) : undefined
        }
        canUpdate={caps.canUpdate}
        canBlock={caps.canBlock}
        canActivate={caps.canActivate}
        canVerify={caps.canVerify}
        onEdit={(row) => setEditTarget(row)}
        onBlock={(row) => setBlockTarget(row)}
        onActivate={async (row) => {
          try {
            await activate.mutateAsync(row.id);
            success('Contractor activated');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onVerify={async (row, verified) => {
          try {
            await verify.mutateAsync({
              id: row.id,
              input: { verified, notes: null },
            });
            success(
              verified
                ? 'Contractor verified'
                : 'Contractor verification rejected',
            );
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />

      {caps.canCreate ? (
        <CreateContractorDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            void contractorsQuery.refetch();
          }}
        />
      ) : null}

      {caps.canUpdate ? (
        <EditContractorDrawer
          open={Boolean(editTarget)}
          contractor={editTarget}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      <BlockContractorDialog
        open={Boolean(blockTarget)}
        contractor={blockTarget}
        loading={block.isPending}
        onClose={() => setBlockTarget(null)}
        onConfirm={async (reason) => {
          if (!blockTarget) return;
          try {
            await block.mutateAsync({
              id: blockTarget.id,
              input: { reason },
            });
            success('Contractor blocked');
            setBlockTarget(null);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />
    </Stack>
  );
}
