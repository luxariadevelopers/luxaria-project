import { useEffect, useState } from 'react';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  fetchOperationsHealth,
  type OperationsHealth,
} from '@/api/observability';
import { getErrorMessage } from '@/api/client';

function StatusChip({ status }: { status: 'ok' | 'degraded' | 'up' | 'down' | 'disabled' }) {
  const color =
    status === 'ok' || status === 'up'
      ? 'success'
      : status === 'disabled'
        ? 'default'
        : 'warning';

  return <Chip size="small" color={color} label={status} />;
}

function MetricCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper?: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>
        {value}
      </Typography>
      {helper ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {helper}
        </Typography>
      ) : null}
    </Paper>
  );
}

export function SystemHealthPage() {
  const [data, setData] = useState<OperationsHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchOperationsHealth();
      setData(response.data ?? null);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load system health'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
      <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MonitorHeartOutlinedIcon color="primary" />
          <Typography variant="h4">System Health</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshOutlinedIcon />}
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {data ? (
        <>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <StatusChip status={data.status} />
              <Typography color="text.secondary">
                {data.service} · v{data.version} · {data.environment}
              </Typography>
              <Typography color="text.secondary">
                Uptime {Math.floor(data.uptimeSeconds / 60)}m · Updated{' '}
                {new Date(data.timestamp).toLocaleString()}
              </Typography>
            </Box>
            {data.alerts.length > 0 ? (
              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                {data.alerts.map((alert) => (
                  <Chip key={alert} color="warning" label={alert.replaceAll('_', ' ')} />
                ))}
              </Box>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                No active operational alerts.
              </Alert>
            )}
          </Paper>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <MetricCard
                title="Database"
                value={data.checks.database.status}
                helper={`${data.checks.database.readyStateLabel} · ${data.checks.database.name}`}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <MetricCard
                title="Redis / queues"
                value={data.checks.redis.status}
                helper={
                  data.checks.redis.enabled
                    ? `${data.checks.redis.host}:${data.checks.redis.port}${
                        data.checks.redis.latencyMs != null
                          ? ` · ${data.checks.redis.latencyMs}ms`
                          : ''
                      }`
                    : 'Queue mode disabled (inline cron jobs)'
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <MetricCard
                title="Memory RSS"
                value={`${data.checks.memory.rssMb} MB`}
                helper={`Heap ${data.checks.memory.heapUsedMb}/${data.checks.memory.heapTotalMb} MB`}
              />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notification delivery (last {data.checks.notifications.windowHours}h)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(
                  [
                    ['Sent', data.checks.notifications.sent],
                    ['Failed', data.checks.notifications.failed],
                    ['Pending', data.checks.notifications.pending],
                    ['Retrying', data.checks.notifications.retrying],
                    ['Skipped', data.checks.notifications.skipped],
                  ] as const
                ).map(([label, count]) => (
                  <TableRow key={label}>
                    <TableCell>{label}</TableCell>
                    <TableCell align="right">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.checks.notifications.thresholdExceeded ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Failed deliveries ({data.checks.notifications.failed}) exceeded the configured
                threshold ({data.checks.notifications.threshold24h}) in the last 24 hours.
              </Alert>
            ) : null}
          </Paper>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Alert configuration
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    Delivery failure threshold (24h):{' '}
                    {data.alertConfig.deliveryFailureThreshold24h}
                  </Typography>
                  <Typography variant="body2">
                    Database down alerts:{' '}
                    {data.alertConfig.databaseDownAlertEnabled ? 'enabled' : 'disabled'}
                  </Typography>
                  <Typography variant="body2">
                    Redis down alerts:{' '}
                    {data.alertConfig.redisDownAlertEnabled ? 'enabled' : 'disabled'}
                  </Typography>
                  <Typography variant="body2">
                    Error tracking:{' '}
                    {data.errorTracking.active
                      ? 'active'
                      : data.errorTracking.enabled
                        ? 'enabled but missing DSN'
                        : 'disabled'}
                  </Typography>
                  {data.alertConfig.errorTrackingDsnMasked ? (
                    <Typography variant="body2" color="text.secondary">
                      DSN: {data.alertConfig.errorTrackingDsnMasked}
                    </Typography>
                  ) : null}
                  {data.alertConfig.opsAlertWebhookConfigured ? (
                    <Typography variant="body2" color="text.secondary">
                      Ops webhook: {data.alertConfig.opsAlertWebhookMasked}
                    </Typography>
                  ) : null}
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Background jobs
                </Typography>
                <Stack spacing={1}>
                  {Object.entries(data.backgroundJobs).map(([key, enabled]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{key.replace(/([A-Z])/g, ' $1')}</Typography>
                      <StatusChip status={enabled ? 'up' : 'down'} />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : null}
    </Stack>
  );
}
