import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { InvoiceDocumentPanel } from '@/vendor-invoices/InvoiceDocumentPanel';
import {
  InvoiceFilters,
  type InvoiceFilterState,
} from '@/vendor-invoices/InvoiceFilters';
import {
  InvoiceFormDrawer,
  type InvoiceEntryMode,
} from '@/vendor-invoices/InvoiceFormDrawer';
import { InvoiceTable } from '@/vendor-invoices/InvoiceTable';
import { resolveVendorInvoiceCapabilities } from '@/vendor-invoices/roleAccess';
import type {
  PublicVendorInvoice,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '@/vendor-invoices/types';
import {
  useCancelVendorInvoice,
  useSubmitVendorInvoice,
  useVendorInvoicesList,
  useVendorOptions,
  useVerifyVendorInvoice,
} from '@/vendor-invoices/useVendorInvoices';

/**
 * Vendor invoice list + capture — `/procurement/vendor-invoices` (Micro Phase 075).
 *
 * Nest: `/vendor-invoices` list/create/update/submit
 * Permissions: `vendor_invoice.view` · `vendor_invoice.create` (submit)
 */
export function VendorInvoicesPage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const caps = resolveVendorInvoiceCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<InvoiceFilterState>({
    status: '',
    matchingStatus: '',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<InvoiceEntryMode>('create');
  const [activeRow, setActiveRow] = useState<PublicVendorInvoice | null>(null);
  const [docOpen, setDocOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      projectId: projectId ?? undefined,
      status: (filters.status || undefined) as VendorInvoiceStatus | undefined,
      matchingStatus: (filters.matchingStatus || undefined) as
        | VendorInvoiceMatchingStatus
        | undefined,
    }),
    [
      page,
      pageSize,
      search,
      projectId,
      filters.status,
      filters.matchingStatus,
    ],
  );

  const list = useVendorInvoicesList(
    listQuery,
    canView && Boolean(projectId),
  );
  const vendors = useVendorOptions('', canView && caps.canViewVendors);
  const submit = useSubmitVendorInvoice();
  const verify = useVerifyVendorInvoice();
  const cancel = useCancelVendorInvoice();

  const vendorLabel = (vendorId: string) => {
    const match = vendors.data?.find((v) => v.id === vendorId);
    if (!match) return vendorId.slice(-6);
    return [match.vendorCode, match.legalName].filter(Boolean).join(' — ');
  };

  const openDrawer = (
    mode: InvoiceEntryMode,
    row: PublicVendorInvoice | null = null,
  ) => {
    setDrawerMode(mode);
    setActiveRow(row);
    setDrawerOpen(true);
  };

  if (!access) {
    return null;
  }

  if (!caps.canView) {
    return (
      <PermissionDenied
        title="Vendor invoices unavailable"
        message="You need vendor_invoice.view to list vendor invoices."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Vendor invoices are scoped to the active project."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="vendor-invoices-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
        }}
      >
        <div>
          <Typography variant="h5">Vendor invoices</Typography>
          <Typography variant="body2" color="text.secondary">
            Invoice capture and matching initiation
            {selectedProject
              ? ` · ${selectedProject.projectName ?? selectedProject.projectCode}`
              : ''}
            .
          </Typography>
        </div>
        {caps.canCreate ? (
          <Button
            variant="contained"
            onClick={() => openDrawer('create')}
            data-testid="vendor-invoice-new"
          >
            New invoice
          </Button>
        ) : null}
      </Stack>

      <InvoiceTable
        rows={list.data?.items ?? []}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
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
          <InvoiceFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        caps={caps}
        vendorLabel={vendorLabel}
        onOpen={(row) => openDrawer('view', row)}
        onEdit={(row) => openDrawer('edit', row)}
        onUpload={(row) => {
          setActiveRow(row);
          setDocOpen(true);
        }}
        onSubmit={async (row) => {
          try {
            await submit.mutateAsync(row.id);
            success('Vendor invoice submitted');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onVerify={async (row) => {
          try {
            await verify.mutateAsync(row.id);
            success('Vendor invoice moved to verification');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onOpenMatch={(row) =>
          navigate(
            `/procurement/vendor-invoices/${encodeURIComponent(row.id)}/match`,
          )
        }
        onCancel={async (row) => {
          try {
            await cancel.mutateAsync(row.id);
            success('Vendor invoice cancelled');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />

      <InvoiceFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setActiveRow(null);
        }}
        mode={drawerMode}
        projectId={projectId}
        invoice={activeRow}
        canCreate={caps.canCreate}
        canViewPurchaseOrders={caps.canViewPurchaseOrders}
        canViewGoodsReceipts={caps.canViewGoodsReceipts}
        canViewVendors={caps.canViewVendors}
        existingInvoices={list.data?.items ?? []}
        vendorLabel={vendorLabel}
      />

      <InvoiceDocumentPanel
        open={docOpen}
        onClose={() => setDocOpen(false)}
        projectId={projectId}
        invoice={activeRow}
        canUpload={caps.canUploadDocument && caps.canCreate}
      />
    </Stack>
  );
}
