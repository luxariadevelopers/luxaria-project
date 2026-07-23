import { useQuery } from '@tanstack/react-query';
import { Alert, Grid, Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  fetchSeDirectorDashboard,
  fetchSePmDashboard,
} from '@/site-execution-dashboard/api';

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

function fmtPct(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `${n}%`;
}

export function SiteExecutionDashboardPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('dashboard.view');

  const pm = useQuery({
    queryKey: ['se-dashboard-pm', selectedProjectId],
    queryFn: () => fetchSePmDashboard(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  const director = useQuery({
    queryKey: ['se-dashboard-director', selectedProjectId],
    queryFn: () => fetchSeDirectorDashboard(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">
        Select a project to view site execution KPIs.
      </Alert>
    );
  }

  if (pm.isError || director.isError) {
    return (
      <RetryPanel
        error={pm.error ?? director.error}
        onRetry={() => {
          void pm.refetch();
          void director.refetch();
        }}
      />
    );
  }

  const pmData = pm.data;
  const dirData = director.data;

  return (
    <Stack spacing={3}>
      <PageHeader
        subtitle="PM and Director KPIs from DPR, labour, materials, measurements, and issues."
      />

      <Typography variant="subtitle1">Project Manager</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="DPR completion"
            value={pmData ? fmtPct(pmData.dprCompletion.percent) : '—'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Labour headcount"
            value={pmData?.labour.headcount ?? '—'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Equipment utilization"
            value={
              pmData?.equipmentUtilization.available
                ? fmtPct(pmData.equipmentUtilization.utilizationPercent)
                : 'N/A'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Material consumed (qty)"
            value={
              pmData
                ? pmData.materialConsumed.quantity.toLocaleString()
                : '—'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Delay hours"
            value={pmData?.delays.hoursLost ?? '—'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Open issues"
            value={
              pmData?.openIssues.available
                ? pmData.openIssues.count
                : pmData
                  ? '0'
                  : '—'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Skilled / Unskilled"
            value={
              pmData
                ? `${pmData.labour.skilled} / ${pmData.labour.unskilled}`
                : '—'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Material value"
            value={
              pmData
                ? pmData.materialConsumed.value.toLocaleString()
                : '—'
            }
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1">Director</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Physical progress"
            value={dirData ? fmtPct(dirData.physicalProgress.percent) : '—'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Financial progress"
            value={
              dirData?.financialProgress.percent !== null &&
              dirData?.financialProgress.percent !== undefined
                ? fmtPct(dirData.financialProgress.percent)
                : '—'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Qty / worker"
            value={dirData?.dailyProductivity.qtyPerWorker ?? '—'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label="Critical issues"
            value={dirData?.criticalIssues.count ?? '—'}
          />
        </Grid>
      </Grid>
      {dirData?.financialProgress.note ? (
        <Typography variant="caption" color="text.secondary">
          {dirData.financialProgress.note}
        </Typography>
      ) : null}
    </Stack>
  );
}
