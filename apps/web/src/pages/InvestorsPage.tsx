import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { CreateInvestorDrawer } from '@/investors/CreateInvestorDrawer';
import { EditInvestorDrawer } from '@/investors/EditInvestorDrawer';
import {
  InvestorFilters,
  type InvestorFilterState,
} from '@/investors/InvestorFilters';
import { InvestorTable } from '@/investors/InvestorTable';
import { resolveInvestorCapabilities } from '@/investors/roleAccess';
import {
  useActivateInvestor,
  useDeactivateInvestor,
  useInvestorsList,
} from '@/investors/useInvestors';
import { VerifyKycDialog } from '@/investors/VerifyKycDialog';
import type {
  InvestorKycStatus,
  InvestorListRow,
  InvestorStatus,
  InvestorType,
} from '@/investors/types';

/**
 * Investor master list (Micro Phase 033).
 * APIs: list/create/update/verify-kyc/activate/deactivate.
 * Bank details are never projected into the table.
 */
export function InvestorsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveInvestorCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<InvestorFilterState>({
    status: '',
    investorType: '',
    kycStatus: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InvestorListRow | null>(null);
  const [kycTarget, setKycTarget] = useState<{
    row: InvestorListRow;
    verified: boolean;
  } | null>(null);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: (filters.status || undefined) as InvestorStatus | undefined,
      investorType: (filters.investorType || undefined) as
        | InvestorType
        | undefined,
      kycStatus: (filters.kycStatus || undefined) as
        | InvestorKycStatus
        | undefined,
    }),
    [page, pageSize, search, filters],
  );

  const investorsQuery = useInvestorsList(listQuery, caps.canView);
  const activate = useActivateInvestor();
  const deactivate = useDeactivateInvestor();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Investors unavailable"
        message="You need the investor.view permission to manage investors."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Investor master — search, KYC review and activation. Bank account data
        is never shown in this list.
      </Typography>

      <InvestorTable
        rows={investorsQuery.data?.items ?? []}
        loading={investorsQuery.isLoading || investorsQuery.isFetching}
        error={investorsQuery.error}
        onRetry={() => void investorsQuery.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={investorsQuery.data?.meta?.total ?? 0}
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
          <InvestorFilters
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
              New investor
            </Button>
          ) : undefined
        }
        canVerifyKyc={caps.canVerifyKyc}
        canActivate={caps.canActivate}
        canUpdate={caps.canUpdate}
        onEdit={(row) => setEditTarget(row)}
        onVerifyKyc={(row, verified) => setKycTarget({ row, verified })}
        onActivate={async (row) => {
          try {
            await activate.mutateAsync(row.id);
            success('Investor activated');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onDeactivate={async (row) => {
          try {
            await deactivate.mutateAsync(row.id);
            success('Investor deactivated');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />

      {caps.canCreate ? (
        <CreateInvestorDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            void investorsQuery.refetch();
          }}
        />
      ) : null}

      {caps.canUpdate ? (
        <EditInvestorDrawer
          open={Boolean(editTarget)}
          investor={editTarget}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      <VerifyKycDialog
        open={Boolean(kycTarget)}
        investor={kycTarget?.row ?? null}
        verified={kycTarget?.verified ?? true}
        onClose={() => setKycTarget(null)}
      />
    </Stack>
  );
}
