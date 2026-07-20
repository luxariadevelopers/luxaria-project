import { Alert, Stack, Typography } from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDateTime, formatPercentage } from '@/format';
import type { PublicVendor, PublicVendorQualityScore } from './types';

type Props = {
  vendor: PublicVendor;
  canView: boolean;
  canViewQuality: boolean;
  qualityScore: PublicVendorQualityScore | undefined;
  qualityLoading?: boolean;
  qualityError?: unknown;
  onRetryQuality?: () => void;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

/**
 * Performance from vendor master fields + optional quality score
 * (`GET /vendors/:vendorId/quality-score`, `quality.view`).
 */
export function VendorPerformancePanel({
  vendor,
  canView,
  canViewQuality,
  qualityScore,
  qualityLoading,
  qualityError,
  onRetryQuality,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Performance unavailable"
        message="You need vendor.view to open vendor performance."
        showHomeLink={false}
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="vendor-performance-panel">
      <Stack
        spacing={1.5}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle2">Commercial terms</Typography>
        <Field
          label="Rating"
          value={vendor.rating != null ? String(vendor.rating) : '—'}
        />
        <Field label="Payment terms" value={vendor.paymentTerms ?? '—'} />
        <Field
          label="Credit limit"
          value={
            Number.isFinite(vendor.creditLimit)
              ? String(vendor.creditLimit)
              : '—'
          }
        />
        <Field
          label="Retention"
          value={formatPercentage(vendor.retentionPercentage)}
        />
        <Field
          label="TDS"
          value={
            vendor.tdsApplicable
              ? vendor.tdsPercentage != null
                ? formatPercentage(vendor.tdsPercentage)
                : 'Applicable'
              : 'Not applicable'
          }
        />
      </Stack>

      {canViewQuality ? (
        qualityError ? (
          <RetryPanel error={qualityError} onRetry={onRetryQuality} forceRetry />
        ) : qualityLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading quality score…
          </Typography>
        ) : qualityScore ? (
          <Stack
            spacing={1.5}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
            data-testid="vendor-quality-score"
          >
            <Typography variant="subtitle2">Quality score</Typography>
            <Field label="Score" value={String(qualityScore.score)} />
            <Field
              label="Rating equivalent"
              value={String(qualityScore.ratingEquivalent)}
            />
            <Field
              label="Inspections"
              value={String(qualityScore.inspectionsCount)}
            />
            <Field
              label="Accepted / rejected / hold"
              value={`${qualityScore.acceptedCount} / ${qualityScore.rejectedCount} / ${qualityScore.holdCount}`}
            />
            <Field
              label="Last inspection"
              value={
                qualityScore.lastInspectionAt
                  ? formatDateTime(qualityScore.lastInspectionAt)
                  : '—'
              }
            />
          </Stack>
        ) : (
          <EmptyState
            title="No quality score"
            description="Quality inspection aggregates will appear after inspections are recorded."
          />
        )
      ) : (
        <Alert severity="info" variant="outlined">
          Quality score requires the quality.view permission. Commercial terms
          above remain available with vendor.view.
        </Alert>
      )}
    </Stack>
  );
}
