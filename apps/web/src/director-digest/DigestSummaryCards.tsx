import {
  Alert,
  Chip,
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
import { formatInr } from '@/format';
import type { DirectorDigestSummary } from './types';

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
      <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700 }}>
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

type Props = {
  digest: DirectorDigestSummary;
};

export function DigestSummaryCards({ digest }: Props) {
  return (
    <Stack spacing={2} data-testid="director-digest-summary">
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Chip size="small" label={`Date: ${digest.digestDate}`} />
        <Chip size="small" label={`Projects: ${digest.projectCount}`} />
        <Chip size="small" label={digest.directorName} />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Yesterday expenses"
            value={formatInr(digest.yesterdayProjectExpenses.amount)}
            helper={`${digest.yesterdayProjectExpenses.count} voucher(s)`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Funds received"
            value={formatInr(digest.fundsReceived.amount)}
            helper={`${digest.fundsReceived.count} receipt(s)`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Payments released"
            value={formatInr(digest.paymentsReleased.amount)}
            helper={`${digest.paymentsReleased.count} payment(s)`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Bank balance"
            value={formatInr(digest.currentBankBalance)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Cash balance"
            value={formatInr(digest.currentCashBalance)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Labour attendance"
            value={`${digest.labourAttendance.workerCount} workers`}
            helper={`${digest.labourAttendance.sheetCount} sheet(s)`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Material receipts"
            value={`${digest.materialReceipts.grnCount} GRN(s)`}
            helper={`${digest.materialReceipts.receivedQuantity} qty · ${digest.materialReceipts.lineCount} line(s)`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Vendor payments due"
            value={formatInr(digest.vendorPaymentsDue.amount)}
            helper={`${digest.vendorPaymentsDue.count} due`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <MetricCard
            title="Pending approvals"
            value={String(digest.pendingApprovals.count)}
          />
        </Grid>
      </Grid>

      {digest.criticalAlerts.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle1">Critical alerts</Typography>
          {digest.criticalAlerts.map((alert) => (
            <Alert
              key={alert.code}
              severity={
                alert.severity === 'critical'
                  ? 'error'
                  : alert.severity === 'warning'
                    ? 'warning'
                    : 'info'
              }
              variant="outlined"
            >
              {alert.message} ({alert.count})
            </Alert>
          ))}
        </Stack>
      ) : null}

      {digest.materialShortages.count > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle1">Material shortages</Typography>
          {digest.materialShortages.items.slice(0, 5).map((item) => (
            <Typography key={item.id} variant="body2" color="text.secondary">
              {item.message}
            </Typography>
          ))}
        </Stack>
      ) : null}

      {digest.projectProgress.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle1">Project progress</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Project</TableCell>
                <TableCell align="right">Progress</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {digest.projectProgress.map((row) => (
                <TableRow key={row.projectId}>
                  <TableCell>
                    {[row.projectCode, row.projectName]
                      .filter(Boolean)
                      .join(' · ') || row.projectId}
                  </TableCell>
                  <TableCell align="right">{row.progressPercent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Summary text
        </Typography>
        <Typography
          component="pre"
          variant="body2"
          sx={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            m: 0,
          }}
        >
          {digest.summaryText}
        </Typography>
      </Paper>
    </Stack>
  );
}
