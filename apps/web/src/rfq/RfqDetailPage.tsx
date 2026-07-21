import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate, formatDateTime } from '@/format';
import { useVendorOptions } from '@/quotations/useQuotations';
import { resolveRfqCapabilities } from './roleAccess';
import { RfqStatus } from './types';
import {
  useCancelRfq,
  useCloseRfq,
  useIssueRfq,
  useRfqDetail,
  useRfqResponses,
} from './useRfqs';

/**
 * RFQ detail — issue / close / cancel + invited vendors + quotation responses.
 */
export function RfqDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveRfqCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const detail = useRfqDetail(id, caps.canView && Boolean(id));
  const responses = useRfqResponses(id, caps.canView && Boolean(id));
  const vendors = useVendorOptions('', caps.canView);
  const issue = useIssueRfq();
  const close = useCloseRfq();
  const cancel = useCancelRfq();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="RFQ unavailable"
        message="You need quotation.view to open this RFQ."
      />
    );
  }

  if (detail.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (detail.error) {
    return (
      <RetryPanel
        error={detail.error}
        onRetry={() => void detail.refetch()}
        forceRetry
      />
    );
  }

  const rfq = detail.data;
  if (!rfq) {
    return (
      <EmptyState title="RFQ not found" description="This RFQ may have been removed." />
    );
  }

  const vendorLabel = (vendorId: string) => {
    const match = vendors.data?.find((v) => v.id === vendorId);
    if (!match) return vendorId.slice(-6);
    return [match.vendorCode, match.legalName].filter(Boolean).join(' — ');
  };

  const busy = issue.isPending || close.isPending || cancel.isPending;
  const canIssue = caps.canManage && rfq.status === RfqStatus.Draft;
  const canClose = caps.canClose && rfq.status === RfqStatus.Issued;
  const canCancel =
    caps.canManage &&
    (rfq.status === RfqStatus.Draft || rfq.status === RfqStatus.Issued);

  const run = async (
    action: () => Promise<unknown>,
    okMessage: string,
  ) => {
    try {
      await action();
      success(okMessage);
      await detail.refetch();
      await responses.refetch();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Stack spacing={2.5} data-testid="rfq-detail-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'flex-start' },
        }}
      >
        <Box>
          <Typography variant="h5">{rfq.rfqNumber}</Typography>
          <Typography color="text.secondary">{rfq.title}</Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 1, alignItems: 'center' }}
          >
            <Chip size="small" label={rfq.status} />
            <Typography variant="body2" color="text.secondary">
              Closes {formatDate(rfq.closingDate)}
            </Typography>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button
            component={RouterLink}
            to="/procurement/rfqs"
            variant="outlined"
            size="small"
          >
            Back to list
          </Button>
          {canIssue ? (
            <Button
              variant="contained"
              size="small"
              disabled={busy}
              onClick={() =>
                void run(() => issue.mutateAsync(rfq.id), 'RFQ issued')
              }
            >
              Issue
            </Button>
          ) : null}
          {canClose ? (
            <Button
              variant="contained"
              size="small"
              disabled={busy}
              onClick={() =>
                void run(() => close.mutateAsync(rfq.id), 'RFQ closed')
              }
            >
              Close
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="outlined"
              color="warning"
              size="small"
              disabled={busy}
              onClick={() =>
                void run(() => cancel.mutateAsync(rfq.id), 'RFQ cancelled')
              }
            >
              Cancel
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Box
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Details
        </Typography>
        <Typography variant="body2">
          Purchase request:{' '}
          <Link
            component={RouterLink}
            to={`/procurement/purchase-requests/${rfq.purchaseRequestId}`}
          >
            {rfq.purchaseRequestId.slice(-8)}
          </Link>
        </Typography>
        {rfq.issuedAt ? (
          <Typography variant="body2" color="text.secondary">
            Issued {formatDateTime(rfq.issuedAt)}
          </Typography>
        ) : null}
        {rfq.notes ? (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {rfq.notes}
          </Typography>
        ) : null}
      </Box>

      <Box
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Invited vendors ({rfq.vendorIds.length})
        </Typography>
        <Stack spacing={0.5}>
          {rfq.vendorIds.map((vendorId) => (
            <Typography key={vendorId} variant="body2">
              {vendorLabel(vendorId)}
            </Typography>
          ))}
          {rfq.vendorIds.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No vendors invited.
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <Box
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Stack
          direction="row"
          sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="subtitle2">
            Quotation responses ({responses.data?.length ?? 0})
          </Typography>
          <Button
            component={RouterLink}
            to={`/procurement/quotations?rfqId=${encodeURIComponent(rfq.id)}`}
            size="small"
          >
            Open quotations
          </Button>
        </Stack>
        {responses.isLoading ? (
          <CircularProgress size={20} />
        ) : (
          <Stack spacing={0.75}>
            {(responses.data ?? []).map((q) => (
              <Typography key={q.id} variant="body2">
                <Link
                  component={RouterLink}
                  to={`/procurement/quotations?highlight=${encodeURIComponent(q.id)}`}
                >
                  {q.quotationNumber ?? q.id.slice(-6)}
                </Link>
                {' · '}
                {vendorLabel(q.vendorId)} · {q.status}
                {q.grandTotal != null ? ` · ${q.grandTotal}` : ''}
              </Typography>
            ))}
            {(responses.data ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No quotations linked to this RFQ yet.
              </Typography>
            ) : null}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
