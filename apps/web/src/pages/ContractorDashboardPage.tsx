import { useQuery } from '@tanstack/react-query';
import { Alert, Grid, Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { fetchContractorDashboard } from '@/contractor-dashboard/api';
import { PageHeader } from '@/layouts/PageHeader';

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      ) : null}
    </Paper>
  );
}

function money(n: number | undefined) {
  if (n === undefined) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function ContractorDashboardPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView =
    hasPermission('dashboard.view') || hasPermission('contractor.view');

  const query = useQuery({
    queryKey: ['contractor-dashboard', selectedProjectId],
    queryFn: () =>
      fetchContractorDashboard({
        projectId: selectedProjectId || undefined,
      }),
    enabled: canView,
  });

  if (!canView) return <PermissionDenied />;
  if (query.isError) {
    return <RetryPanel error={query.error} onRetry={() => void query.refetch()} />;
  }

  const data = query.data;

  return (
    <Stack spacing={3}>
      <PageHeader
        subtitle="Open work orders, pending RA bills, retention held, outstanding payables, and compliance expiries."
      />

      {!selectedProjectId ? (
        <Alert severity="info">
          No project selected — commercial KPIs are company-wide; select a
          project to scope WOs and bills.
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            label="Open work orders"
            value={
              data?.openWorkOrders.available
                ? data.openWorkOrders.count
                : data
                  ? '0'
                  : '—'
            }
            hint={
              data && !data.openWorkOrders.available
                ? 'WO module not registered'
                : undefined
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            label="Pending bills"
            value={
              data?.pendingBills.available
                ? data.pendingBills.count
                : data
                  ? '0'
                  : '—'
            }
            hint={
              data?.pendingBills.available
                ? `₹ ${money(data.pendingBills.amount)}`
                : undefined
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            label="Retention held"
            value={
              data?.retentionHeld.available
                ? money(data.retentionHeld.amount)
                : data
                  ? '0'
                  : '—'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            label="Outstanding payable"
            value={
              data?.outstandingPayable.available
                ? money(data.outstandingPayable.amount)
                : data
                  ? '0'
                  : '—'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            label="Compliance expiries"
            value={data?.complianceExpiries.count ?? '—'}
            hint={
              data
                ? `Licence ${data.complianceExpiries.labourLicence} · Insurance ${data.complianceExpiries.insurance} (${data.complianceExpiries.withinDays}d)`
                : undefined
            }
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
