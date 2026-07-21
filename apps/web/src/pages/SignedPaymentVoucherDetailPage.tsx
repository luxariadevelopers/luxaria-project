import { useMemo, useState } from 'react';
import { Alert, Box, Link, Paper, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatInr } from '@/format';
import { DocumentActionMenu } from '@/print-pdf';
import { signedPaymentVoucherPdfSource } from '@/print-pdf/sources';
import { buildVoucherTimeline } from '@/signed-payment-vouchers/buildVoucherTimeline';
import { JournalLink } from '@/signed-payment-vouchers/JournalLink';
import { resolveSignedPaymentVoucherCapabilities } from '@/signed-payment-vouchers/roleAccess';
import { SIGNED_PAYMENT_VOUCHER_ROUTES } from '@/signed-payment-vouchers/routes';
import { SignaturesPanel } from '@/signed-payment-vouchers/SignaturesPanel';
import {
  useApproveSignedPaymentVoucher,
  useCancelSignedPaymentVoucher,
  usePostSignedPaymentVoucher,
  useReverseSignedPaymentVoucher,
  useSignedPaymentVoucherDetail,
} from '@/signed-payment-vouchers/useSignedPaymentVouchers';
import {
  VoucherActionDialog,
  type VoucherDialogMode,
} from '@/signed-payment-vouchers/VoucherActionDialog';
import { VoucherStatusChip } from '@/signed-payment-vouchers/VoucherStatusChip';
import { VoucherSummary } from '@/signed-payment-vouchers/VoucherSummary';
import { resolveSignedPaymentVoucherDetailActions } from '@/signed-payment-vouchers/workflowActions';
import { WorkflowTimeline } from '@/workflow-timeline';

function mapsUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

function CaptureLocation({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  if (latitude == null || longitude == null) {
    return (
      <EmptyState
        title="No location captured"
        description="This voucher has no latitude / longitude from the capture device."
      />
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="signed-voucher-map">
      <Stack spacing={1}>
        <Typography variant="subtitle1">Capture location</Typography>
        <Typography variant="body2" color="text.secondary">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Typography>
        <Link href={mapsUrl(latitude, longitude)} target="_blank" rel="noreferrer">
          Open in map
        </Link>
      </Stack>
    </Paper>
  );
}

/**
 * Signed payment voucher detail — `/contractors/signed-vouchers/:voucherId`.
 *
 * Nest: GET detail · POST approve/post/reverse/cancel
 * Permissions: payment.view / payment.approve / payment.release
 */
export function SignedPaymentVoucherDetailPage() {
  const { voucherId = '' } = useParams<{ voucherId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveSignedPaymentVoucherCapabilities(hasPermission);
  const { projects } = useProject();
  const { success, error: notifyError } = useNotify();
  const [dialogMode, setDialogMode] = useState<VoucherDialogMode>(null);

  const canView = Boolean(access) && caps.canView;
  const detailQuery = useSignedPaymentVoucherDetail(voucherId || null, canView);
  const voucher = detailQuery.data;

  const approve = useApproveSignedPaymentVoucher();
  const post = usePostSignedPaymentVoucher();
  const reverse = useReverseSignedPaymentVoucher();
  const cancel = useCancelSignedPaymentVoucher();

  const allowed = voucher
    ? resolveSignedPaymentVoucherDetailActions(voucher, caps)
    : [];

  const projectLabel = useMemo(() => {
    if (!voucher) return '—';
    const p = projects.find((x) => x.id === voucher.projectId);
    if (!p) return voucher.projectId;
    return p.projectCode
      ? `${p.projectCode} · ${p.projectName}`
      : p.projectName;
  }, [voucher, projects]);

  const actions: EntityDetailAction[] = voucher
    ? [
        {
          id: 'approve',
          label: 'Approve',
          permission: 'payment.approve',
          allowedStatuses: ['submitted'],
          color: 'success',
          variant: 'contained',
          onClick: () => {
            void (async () => {
              try {
                await approve.mutateAsync(voucher.id);
                success('Voucher approved — PDF generated');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: approve.isPending,
          disabled: !allowed.includes('approve'),
        },
        {
          id: 'post',
          label: 'Post',
          permission: 'payment.approve',
          allowedStatuses: ['approved'],
          color: 'success',
          variant: 'contained',
          onClick: () => {
            void (async () => {
              try {
                await post.mutateAsync(voucher.id);
                success('Voucher posted — journal created');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: post.isPending,
          disabled: !allowed.includes('post'),
        },
        {
          id: 'reverse',
          label: 'Reverse',
          permission: 'payment.approve',
          allowedStatuses: ['posted'],
          color: 'warning',
          variant: 'outlined',
          onClick: () => setDialogMode('reverse'),
          loading: reverse.isPending,
          disabled: !allowed.includes('reverse'),
        },
        {
          id: 'cancel',
          label: 'Cancel',
          permission: 'payment.release',
          allowedStatuses: ['draft', 'submitted', 'approved', 'returned'],
          color: 'warning',
          variant: 'outlined',
          onClick: () => setDialogMode('cancel'),
          loading: cancel.isPending,
          disabled: !allowed.includes('cancel'),
        },
      ]
    : [];

  const timelineEvents = useMemo(
    () => (voucher ? buildVoucherTimeline(voucher) : []),
    [voucher],
  );

  const pdfSource = voucher
    ? signedPaymentVoucherPdfSource({
        voucherPdfDocumentId: voucher.voucherPdfDocumentId,
        status: voucher.status,
        label: 'Voucher PDF',
      })
    : null;

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Signed voucher unavailable"
        message="You need the payment.view permission to open signed payment vouchers."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Signed voucher denied"
        message="You do not have access to this signed payment voucher."
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !voucher
        }
        permissionTitle="Signed voucher unavailable"
        permissionMessage="You need the payment.view permission to open signed payment vouchers."
        notFoundTitle="Voucher not found"
        notFoundDescription="This voucher id is invalid or the record was removed."
        header={
          voucher ? (
            <DetailHeader
              title="Signed payment voucher"
              code={voucher.voucherNumber}
              subtitle={voucher.recipientName}
              backTo={SIGNED_PAYMENT_VOUCHER_ROUTES.list}
              backLabel="Signed vouchers"
              meta={
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  <VoucherStatusChip status={voucher.status} />
                  {pdfSource ? (
                    <DocumentActionMenu
                      source={pdfSource}
                      canViewEntity={caps.canView}
                      buttonLabel="Voucher PDF"
                      iconOnly
                    />
                  ) : null}
                </Stack>
              }
            />
          ) : undefined
        }
        actionBar={
          voucher ? (
            <EntityActionBar
              actions={actions}
              status={voucher.status}
              hasPermission={hasPermission}
              emptyHint="No approve / post / reverse actions for this status and your permissions."
            />
          ) : undefined
        }
        summary={
          voucher ? (
            <VoucherSummary voucher={voucher} projectLabel={projectLabel} />
          ) : undefined
        }
        timeline={
          voucher ? (
            <WorkflowTimeline
              events={timelineEvents}
              canView={caps.canView}
              title="Lifecycle timeline"
            />
          ) : undefined
        }
      >
        {voucher ? (
          <Stack spacing={3} data-testid="signed-voucher-detail-body">
            <Alert severity="info" variant="outlined">
              Net payable: {formatInr(voucher.netAmount)} · Project: {projectLabel}
            </Alert>
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Signatures & evidence
              </Typography>
              <SignaturesPanel voucher={voucher} />
            </Box>
            <CaptureLocation
              latitude={voucher.latitude}
              longitude={voucher.longitude}
            />
            <JournalLink voucher={voucher} />
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <VoucherActionDialog
        mode={dialogMode}
        voucherNumber={voucher?.voucherNumber}
        loading={reverse.isPending || cancel.isPending}
        onClose={() => setDialogMode(null)}
        onConfirm={({ reason, createReplacement }) => {
          if (!voucher) return;
          void (async () => {
            try {
              if (dialogMode === 'reverse') {
                await reverse.mutateAsync({
                  id: voucher.id,
                  input: { reason, createReplacement },
                });
                success('Voucher reversed');
              } else if (dialogMode === 'cancel') {
                await cancel.mutateAsync({
                  id: voucher.id,
                  input: { cancellationReason: reason },
                });
                success('Voucher cancelled');
              }
              setDialogMode(null);
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        }}
      />
    </>
  );
}
