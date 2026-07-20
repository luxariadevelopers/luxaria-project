import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { buildPurchaseOrderCreatePath } from '@/purchase-orders/validation';
import { quotationComparisonPath } from '@/quotation-comparisons/paths';
import {
  QuotationEntryDrawer,
  type QuotationEntryMode,
} from '@/quotations/QuotationEntryDrawer';
import {
  QuotationFilters,
  type QuotationFilterState,
} from '@/quotations/QuotationFilters';
import { QuotationTable } from '@/quotations/QuotationTable';
import { resolveQuotationCapabilities } from '@/quotations/roleAccess';
import type { PublicVendorQuotation, VendorQuotationStatus } from '@/quotations/types';
import {
  useCancelVendorQuotation,
  useMarkVendorQuotationFinal,
  useSubmitVendorQuotation,
  useVendorOptions,
  useVendorQuotationsList,
} from '@/quotations/useQuotations';

/**
 * Vendor quotation list + entry — `/procurement/quotations` (Micro Phase 063).
 *
 * Nest: `/vendor-quotations` list/create/revise/mark-final/document
 * Permissions: `quotation.view` · `quotation.manage` · `quotation.finalize`
 */
export function QuotationsPage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const caps = resolveQuotationCapabilities(hasPermission);
  const canCreatePo = hasPermission('purchase.order');
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<QuotationFilterState>({
    status: '',
    purchaseRequestId: '',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<QuotationEntryMode>('create');
  const [activeRow, setActiveRow] = useState<PublicVendorQuotation | null>(
    null,
  );

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      projectId: projectId ?? undefined,
      status: (filters.status || undefined) as VendorQuotationStatus | undefined,
      purchaseRequestId: filters.purchaseRequestId.trim() || undefined,
    }),
    [page, pageSize, search, projectId, filters.status, filters.purchaseRequestId],
  );

  const list = useVendorQuotationsList(
    listQuery,
    canView && Boolean(projectId),
  );
  const vendors = useVendorOptions('', canView);
  const submit = useSubmitVendorQuotation();
  const markFinal = useMarkVendorQuotationFinal();
  const cancel = useCancelVendorQuotation();

  const vendorLabel = (vendorId: string) => {
    const match = vendors.data?.find((v) => v.id === vendorId);
    if (!match) return vendorId.slice(-6);
    return [match.vendorCode, match.legalName].filter(Boolean).join(' — ');
  };

  const openDrawer = (
    mode: QuotationEntryMode,
    row: PublicVendorQuotation | null = null,
  ) => {
    setDrawerMode(mode);
    setActiveRow(row);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setActiveRow(null);
  };

  if (!access) {
    return null;
  }

  if (!caps.canView) {
    return (
      <PermissionDenied
        title="Quotations unavailable"
        message="You need quotation.view to list vendor quotations."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Vendor quotations are scoped to the active project."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="quotations-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
        }}
      >
        <div>
          <Typography variant="h5">Quotations</Typography>
          <Typography variant="body2" color="text.secondary">
            Capture multiple vendor quotations against purchase requests
            {selectedProject
              ? ` · ${selectedProject.projectName ?? selectedProject.projectCode}`
              : ''}
            .
          </Typography>
        </div>
      </Stack>

      <QuotationTable
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
          <QuotationFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {hasPermission('quotation.compare') &&
            filters.purchaseRequestId.trim() ? (
              <Button
                component={RouterLink}
                to={quotationComparisonPath(filters.purchaseRequestId.trim())}
                variant="outlined"
                data-testid="open-quotation-comparison-from-quotations"
              >
                Compare quotations
              </Button>
            ) : null}
            {caps.canManage ? (
              <Button
                variant="contained"
                onClick={() => openDrawer('create')}
              >
                New quotation
              </Button>
            ) : null}
          </Stack>
        }
        caps={caps}
        vendorLabel={vendorLabel}
        canCreatePurchaseOrder={canCreatePo}
        onCreatePurchaseOrder={(row) => {
          navigate(
            buildPurchaseOrderCreatePath({
              purchaseRequestId: row.purchaseRequestId,
              selectedQuotationId: row.id,
            }),
          );
        }}
        onOpen={(row) => openDrawer('view', row)}
        onEdit={(row) => openDrawer('edit', row)}
        onRevise={(row) => openDrawer('revise', row)}
        onUpload={(row) => openDrawer('edit', row)}
        onSubmit={async (row) => {
          try {
            await submit.mutateAsync(row.id);
            success(`${row.quotationNumber} submitted`);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onFinalise={async (row) => {
          try {
            await markFinal.mutateAsync(row.id);
            success(`${row.quotationNumber} marked final`);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onCancel={async (row) => {
          try {
            await cancel.mutateAsync(row.id);
            success(`${row.quotationNumber} cancelled`);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />

      <QuotationEntryDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        mode={drawerMode}
        projectId={projectId}
        quotation={activeRow}
        canManage={caps.canManage}
        vendorLabel={vendorLabel}
      />
    </Stack>
  );
}
