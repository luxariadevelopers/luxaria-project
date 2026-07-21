import { Alert, Grid, Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { resolveSalesDashboardCapabilities } from '@/sales-dashboard/roleAccess';
import { useSalesDashboard } from '@/sales-dashboard/useSalesDashboard';

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  );
}

export function SalesDashboardPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveSalesDashboardCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const query = useSalesDashboard(
    { projectId: selectedProjectId ?? undefined },
    caps.canView,
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Sales dashboard unavailable"
        message="You need the sales_report.view permission."
      />
    );
  }

  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const data = query.data;

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Sales Dashboard</Typography>
      <Typography variant="body2" color="text.secondary">
        Leads, bookings, collections, and cancellation KPIs
        {selectedProjectId ? ' for the active project.' : ' (company-wide).'}
      </Typography>
      {!data && query.isLoading ? (
        <Alert severity="info">Loading sales KPIs…</Alert>
      ) : null}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Total leads" value={data?.leadsTotal ?? '—'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Conversions" value={data?.conversions ?? '—'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Reservations" value={data?.reservations ?? '—'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Bookings" value={data?.bookings ?? '—'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Sales value"
            value={
              data ? data.salesValue.toLocaleString() : '—'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Collection ratio"
            value={
              data
                ? `${Math.round(data.collectionEfficiency.ratio * 100)}%`
                : '—'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Outstanding dues"
            value={
              data ? data.outstandingDues.toLocaleString() : '—'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Cancellation rate"
            value={
              data
                ? `${Math.round(data.cancellationRate.ratio * 100)}%`
                : '—'
            }
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
