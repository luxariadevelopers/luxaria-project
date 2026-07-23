import { useMemo, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  ProofPanel,
  ReceiptFilters,
  ReceiptForm,
  ReceiptTable,
  resolveCustomerReceiptCapabilities,
  type CustomerReceiptStatus,
  type CustomerReceiptSourceType,
  type PublicCustomerReceipt,
  type ReceiptFilterState,
} from '@/customer-receipts';
import {
  useBankAccountOptions,
  useBookingOptions,
  useCancelCustomerReceipt,
  useCustomerReceiptsList,
  usePostCustomerReceipt,
  useRegenerateCustomerReceiptPdf,
} from '@/customer-receipts/useCustomerReceipts';

/**
 * Sales collections — `/sales/collections` (Micro Phase 105).
 *
 * Nest APIs: `/customer-receipts` (+ post / cancel / regenerate-pdf).
 * Permissions: `collection.view` / `collection.create` / `collection.approve`.
 */
export function CollectionsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveCustomerReceiptCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const [filters, setFilters] = useState<ReceiptFilterState>({
    status: '',
    sourceType: '',
    search: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [proofTarget, setProofTarget] =
    useState<PublicCustomerReceipt | null>(null);
  const [cancelTarget, setCancelTarget] =
    useState<PublicCustomerReceipt | null>(null);
  const [postTarget, setPostTarget] =
    useState<PublicCustomerReceipt | null>(null);

  const canView = Boolean(access) && caps.canView;

  const listQuery = useMemo(
    () => ({
      page: 1,
      limit: 50,
      projectId: selectedProjectId ?? undefined,
      status: (filters.status || undefined) as CustomerReceiptStatus | undefined,
      sourceType: (filters.sourceType || undefined) as
        | CustomerReceiptSourceType
        | undefined,
      search: filters.search.trim() || undefined,
    }),
    [selectedProjectId, filters],
  );

  const list = useCustomerReceiptsList(listQuery, canView);
  const banks = useBankAccountOptions(
    selectedProjectId,
    canView && caps.canCreate && caps.canViewBankAccounts,
  );
  const bookings = useBookingOptions(
    selectedProjectId,
    canView && caps.canCreate && caps.canViewBookings,
  );

  const post = usePostCustomerReceipt();
  const cancel = useCancelCustomerReceipt();
  const regenerate = useRegenerateCustomerReceiptPdf();

  if (access && !caps.canView) {
    return (
      <Alert severity="error" data-testid="collections-forbidden">
        You need the `collection.view` permission to manage customer receipts.
      </Alert>
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void list.refetch()}>
            Retry
          </Button>
        }
      >
        Access denied for customer receipts (403).
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Collections"
        subtitle={`Customer receipts${
          selectedProject ? ` — ${selectedProject.projectName}` : ''
        }. Record, allocate demands, post, and download PDFs. Duplicate bank transaction references are rejected by Nest (409).`}
        actions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Record receipt
            </Button>
          ) : undefined
        }
      />

      <ReceiptFilters value={filters} onChange={setFilters} />

      <ReceiptTable
        rows={list.data?.items ?? []}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyMessage="No collections for this project yet."
        caps={caps}
        onPost={(row) => setPostTarget(row)}
        onCancel={(row) => setCancelTarget(row)}
        onProof={(row) => setProofTarget(row)}
      />

      <ReceiptForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        bookings={bookings.data ?? []}
        bankAccounts={banks.data ?? []}
        canViewBookings={caps.canViewBookings}
        canViewBankAccounts={caps.canViewBankAccounts}
        canPost={caps.canPost}
        banksLoading={banks.isLoading}
      />

      <ProofPanel
        open={Boolean(proofTarget)}
        onClose={() => setProofTarget(null)}
        receipt={proofTarget}
        caps={caps}
        regenerating={regenerate.isPending}
        onRegeneratePdf={async (row) => {
          try {
            const updated = await regenerate.mutateAsync(row.id);
            setProofTarget(updated);
            success(`PDF regenerated for ${updated.receiptNumber}`);
          } catch (err) {
            notifyError(getErrorMessage(err, 'PDF regeneration failed'));
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(postTarget)}
        title="Post collection"
        description={
          postTarget
            ? `Post ${postTarget.receiptNumber}? This allocates demands, creates the journal, and generates the receipt PDF.`
            : ''
        }
        confirmLabel="Post"
        loading={post.isPending}
        onCancel={() => setPostTarget(null)}
        onConfirm={() => {
          if (!postTarget) return;
          void (async () => {
            try {
              const row = await post.mutateAsync(postTarget.id);
              success(`Posted ${row.receiptNumber}; PDF generated`);
              setPostTarget(null);
            } catch (err) {
              notifyError(getErrorMessage(err, 'Post failed'));
            }
          })();
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel draft receipt"
        description={
          cancelTarget
            ? `Cancel draft ${cancelTarget.receiptNumber}?`
            : ''
        }
        confirmLabel="Cancel receipt"
        destructive
        loading={cancel.isPending}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (!cancelTarget) return;
          void (async () => {
            try {
              await cancel.mutateAsync({ id: cancelTarget.id });
              success(`Cancelled ${cancelTarget.receiptNumber}`);
              setCancelTarget(null);
            } catch (err) {
              notifyError(getErrorMessage(err, 'Cancel failed'));
            }
          })();
        }}
      />
    </Stack>
  );
}
