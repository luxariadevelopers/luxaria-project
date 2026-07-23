import { useQuery } from '@tanstack/react-query';
import { Alert, Grid, Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { fetchInventoryDashboard } from '@/inventory-dashboard/api';
import { PageHeader } from '@/layouts/PageHeader';

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

export function InventoryDashboardPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('stock.view');

  const query = useQuery({
    queryKey: ['inventory-dashboard', selectedProjectId],
    queryFn: () => fetchInventoryDashboard(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to view inventory KPIs.</Alert>;
  }

  if (query.isError) {
    return <RetryPanel error={query.error} onRetry={() => void query.refetch()} />;
  }

  const data = query.data;

  return (
    <Stack spacing={2}>
      <PageHeader
        subtitle="Stock value, movement velocity, critical / reorder items, and variance."
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Stock value"
            value={data ? data.stockValue.toLocaleString() : '—'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Critical stock" value={data?.criticalStock ?? '—'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Reorder items" value={data?.reorderItems ?? '—'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Dead stock" value={data?.deadStock ?? '—'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Slow moving" value={data?.slowMoving ?? '—'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Fast moving" value={data?.fastMoving ?? '—'} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Active reservations"
            value={data?.activeReservations ?? '—'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Variance (30d)"
            value={data?.varianceAdjustments30d ?? '—'}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
