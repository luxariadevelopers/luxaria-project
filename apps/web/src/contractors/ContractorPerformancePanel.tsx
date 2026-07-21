import { Stack, Typography } from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDateTime } from '@/format';
import {
  contractorStatusLabel,
  contractorTypeLabel,
} from './labels';
import type { ContractorPerformance, PublicContractor } from './types';

type Props = {
  contractor: PublicContractor;
  performance: ContractorPerformance | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
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

export function ContractorPerformancePanel({
  contractor,
  performance,
  loading,
  error,
  onRetry,
  canView,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Performance unavailable"
        message="You need contractor.view to open contractor performance."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading performance…
      </Typography>
    );
  }

  if (!performance) {
    return (
      <EmptyState
        title="No performance data"
        description="Performance aggregates will appear after projects and work measurements exist."
      />
    );
  }

  const licence = performance.labourLicence;

  return (
    <Stack spacing={2} data-testid="contractor-performance-panel">
      <Stack
        spacing={1.5}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle2">Profile</Typography>
        <Field
          label="Rating"
          value={
            performance.rating != null
              ? String(performance.rating)
              : contractor.rating != null
                ? String(contractor.rating)
                : '—'
          }
        />
        <Field
          label="Type"
          value={contractorTypeLabel(performance.contractorType)}
        />
        <Field
          label="Status"
          value={contractorStatusLabel(performance.status)}
        />
        <Field
          label="Active projects"
          value={String(performance.activeProjectCount)}
        />
      </Stack>

      <Stack
        spacing={1.5}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle2">Labour licence</Typography>
        <Field label="Licence number" value={licence.licenceNumber ?? '—'} />
        <Field
          label="Valid to"
          value={licence.validTo ? formatDateTime(licence.validTo) : '—'}
        />
        <Field
          label="Valid"
          value={
            licence.isValid == null
              ? '—'
              : licence.isValid
                ? 'Yes'
                : 'No'
          }
        />
      </Stack>

      <Stack
        spacing={1.5}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle2">Work measurements</Typography>
        <Field
          label="Submitted / verified"
          value={`${performance.workMeasurements.submittedCount} / ${performance.workMeasurements.verifiedCount}`}
        />
        <Field
          label="Submitted quantity"
          value={String(performance.workMeasurements.totalSubmittedQuantity)}
        />
        <Field
          label="Verified quantity"
          value={String(performance.workMeasurements.totalVerifiedQuantity)}
        />
      </Stack>

      <Stack
        spacing={1.5}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle2">Documents on file</Typography>
        <Field label="Total" value={String(performance.documents.totalCount)} />
        <Field
          label="Labour licence / insurance"
          value={`${performance.documents.labourLicenceCount} / ${performance.documents.insuranceCount}`}
        />
        <Field
          label="As of"
          value={formatDateTime(performance.asOf)}
        />
      </Stack>
    </Stack>
  );
}
