import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { BlockVendorDialog } from '@/vendors/BlockVendorDialog';
import { CreateVendorDrawer } from '@/vendors/CreateVendorDrawer';
import { EditVendorDrawer } from '@/vendors/EditVendorDrawer';
import {
  VendorFilters,
  type VendorFilterState,
} from '@/vendors/VendorFilters';
import { VendorTable } from '@/vendors/VendorTable';
import { resolveVendorCapabilities } from '@/vendors/roleAccess';
import {
  useActivateVendor,
  useBlockVendor,
  useVendorsList,
  useVerifyVendor,
} from '@/vendors/useVendors';
import type {
  VendorListRow,
  VendorStatus,
  VendorVerificationStatus,
} from '@/vendors/types';

/**
 * Vendor master list (Micro Phase 056).
 * APIs: GET/POST /vendors, PATCH, POST …/verify|activate|block.
 * Bank account numbers are never projected into the table.
 */
export function VendorsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveVendorCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<VendorFilterState>({
    status: '',
    verificationStatus: '',
    materialCategory: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VendorListRow | null>(null);
  const [blockTarget, setBlockTarget] = useState<VendorListRow | null>(null);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: (filters.status || undefined) as VendorStatus | undefined,
      verificationStatus: (filters.verificationStatus || undefined) as
        | VendorVerificationStatus
        | undefined,
      materialCategory: filters.materialCategory.trim() || undefined,
    }),
    [page, pageSize, search, filters],
  );

  const vendorsQuery = useVendorsList(listQuery, caps.canView);
  const activate = useActivateVendor();
  const block = useBlockVendor();
  const verify = useVerifyVendor();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Vendors unavailable"
        message="You need the vendor.view permission to manage vendors."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Vendor master — search, categories, ratings and blocked status. Full
        bank account numbers are never shown in this list.
      </Typography>

      <VendorTable
        rows={vendorsQuery.data?.items ?? []}
        loading={vendorsQuery.isLoading || vendorsQuery.isFetching}
        error={vendorsQuery.error}
        onRetry={() => void vendorsQuery.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={vendorsQuery.data?.meta?.total ?? 0}
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
          <VendorFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canCreate ? (
            <Button
              variant="contained"
              onClick={() => setCreateOpen(true)}
              data-testid="vendor-create-button"
            >
              New vendor
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
            success('Vendor activated');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onVerify={async (row, verified) => {
          try {
            await verify.mutateAsync({
              id: row.id,
              input: { verified },
            });
            success(verified ? 'Vendor verified' : 'Vendor verification rejected');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />

      {caps.canCreate ? (
        <CreateVendorDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            void vendorsQuery.refetch();
          }}
        />
      ) : null}

      {caps.canUpdate ? (
        <EditVendorDrawer
          open={Boolean(editTarget)}
          vendor={editTarget}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      <BlockVendorDialog
        open={Boolean(blockTarget)}
        vendor={blockTarget}
        loading={block.isPending}
        onClose={() => setBlockTarget(null)}
        onConfirm={async (reason) => {
          if (!blockTarget) return;
          try {
            await block.mutateAsync({
              id: blockTarget.id,
              input: { reason },
            });
            success('Vendor blocked');
            setBlockTarget(null);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />
    </Stack>
  );
}
