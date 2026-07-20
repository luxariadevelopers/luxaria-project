import { useState } from 'react';
import {
  Alert,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { ExceptionApproveDialog } from '@/vendor-invoices/ExceptionApproveDialog';
import { InvoiceStatusChip } from '@/vendor-invoices/InvoiceStatusChip';
import { MatchMatrix } from '@/vendor-invoices/MatchMatrix';
import { RejectMatchingDialog } from '@/vendor-invoices/RejectMatchingDialog';
import { ToleranceIndicators } from '@/vendor-invoices/ToleranceIndicators';
import { resolveVendorInvoiceCapabilities } from '@/vendor-invoices/roleAccess';
import {
  useApproveVendorInvoice,
  useMatchVendorInvoice,
  usePostVendorInvoice,
  useRejectVendorInvoiceMatching,
  useVendorInvoiceDetail,
} from '@/vendor-invoices/useVendorInvoices';
import { resolveVendorInvoiceActions } from '@/vendor-invoices/workflowActions';

/**
 * Three-way match — `/procurement/vendor-invoices/:invoiceId/match` (Micro Phase 076).
 *
 * Nest: match / reject-matching / approve / post
 * Permissions: `vendor_invoice.match` · `vendor_invoice.approve` · `vendor_invoice.post`
 */
export function VendorInvoiceMatchPage() {
  const { invoiceId = '' } = useParams<{ invoiceId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveVendorInvoiceCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const detail = useVendorInvoiceDetail(
    invoiceId,
    Boolean(access) && caps.canView && Boolean(invoiceId),
  );
  const match = useMatchVendorInvoice();
  const reject = useRejectVendorInvoiceMatching();
  const approve = useApproveVendorInvoice();
  const post = usePostVendorInvoice();

  if (!access) return null;

  if (!caps.canView) {
    return (
      <PermissionDenied
        title="Match view unavailable"
        message="You need vendor_invoice.view to open three-way matching."
      />
    );
  }

  if (detail.isLoading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading invoice…
      </Typography>
    );
  }

  if (detail.error) {
    if (isForbiddenError(detail.error)) {
      return (
        <PermissionDenied
          title="Access denied"
          message="You do not have permission to view this vendor invoice."
        />
      );
    }
    return (
      <RetryPanel
        title="Could not load invoice"
        message={getErrorMessage(detail.error)}
        onRetry={() => void detail.refetch()}
      />
    );
  }

  const invoice = detail.data;
  if (!invoice) {
    return (
      <EmptyState
        title="Invoice not found"
        description="The vendor invoice may have been removed."
      />
    );
  }

  const actions = new Set(resolveVendorInvoiceActions(invoice, caps));

  return (
    <Stack spacing={2} data-testid="vendor-invoice-match-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <div>
          <Typography variant="h5">
            Three-way match · {invoice.documentNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vendor inv {invoice.invoiceNumber} · Total{' '}
            {formatInr(invoice.totalAmount)} · Payable{' '}
            {formatInr(invoice.remainingPayable)}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <InvoiceStatusChip status={invoice.status} />
          </Stack>
        </div>
        <Button
          component={RouterLink}
          to="/procurement/vendor-invoices"
          variant="outlined"
        >
          Back to invoices
        </Button>
      </Stack>

      <ToleranceIndicators invoice={invoice} />

      <Stack direction="row" spacing={1} flexWrap="wrap">
        {actions.has('match') ? (
          <Button
            variant="contained"
            disabled={match.isPending}
            onClick={async () => {
              try {
                const result = await match.mutateAsync(invoice.id);
                success(`Matching complete (${result.matchingStatus})`);
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            }}
          >
            Run three-way match
          </Button>
        ) : null}
        {actions.has('reject_matching') ? (
          <Button
            color="error"
            variant="outlined"
            onClick={() => setRejectOpen(true)}
          >
            Reject matching
          </Button>
        ) : null}
        {actions.has('approve') ? (
          <Button variant="contained" onClick={() => setApproveOpen(true)}>
            Approve
          </Button>
        ) : null}
        {actions.has('post') ? (
          <Button
            variant="contained"
            color="success"
            disabled={post.isPending}
            onClick={async () => {
              try {
                await post.mutateAsync(invoice.id);
                success('Vendor invoice posted (AP journal)');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            }}
          >
            Post AP journal
          </Button>
        ) : null}
        <Button
          component={RouterLink}
          to="/procurement/vendor-payments"
          variant="text"
        >
          Vendor payments
        </Button>
      </Stack>

      {!caps.canMatch && !caps.canApprove && !caps.canPost ? (
        <Alert severity="info">
          View only — match / approve / post require vendor_invoice.match,
          vendor_invoice.approve, or vendor_invoice.post.
        </Alert>
      ) : null}

      <MatchMatrix invoice={invoice} />

      <ExceptionApproveDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        matchingStatus={invoice.matchingStatus}
        loading={approve.isPending}
        onConfirm={async (comment) => {
          try {
            await approve.mutateAsync({
              id: invoice.id,
              input: comment
                ? { exceptionApprovalComment: comment }
                : {},
            });
            success('Vendor invoice approved');
            setApproveOpen(false);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />

      <RejectMatchingDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        loading={reject.isPending}
        onConfirm={async (reason) => {
          try {
            await reject.mutateAsync({
              id: invoice.id,
              input: { reason },
            });
            success('Matching rejected');
            setRejectOpen(false);
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />
    </Stack>
  );
}
