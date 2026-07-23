import {
  Alert,
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { DrillDownNav } from '@/director-command-centre/DrillDownNav';
import { KpiCard } from '@/director-command-centre/KpiCard';
import { formatOptionalMoney } from '@/director-command-centre/formatMetric';
import type { CapitalPlanSummary } from '@/director-command-centre/projectDashboardTypes';

type Props = {
  plan: CapitalPlanSummary | undefined;
  loading?: boolean;
};

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(2)}%`;
}

/**
 * Invested vs approved budget, per-director pending, optional investor loan terms.
 */
export function CapitalPlanSection({ plan, loading = false }: Props) {
  const directors = plan?.directors ?? [];
  const investors = plan?.investors ?? [];

  return (
    <Stack spacing={1.5} data-testid="capital-plan-section">
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Capital plan
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: 'repeat(3, 1fr)',
          },
        }}
      >
        <KpiCard
          title="Invested till now"
          amount={plan?.totalInvested}
          loading={loading}
          drillDown={plan?.drillDown ?? []}
        />
        <KpiCard
          title="Pending vs approved budget"
          amount={plan?.pendingToInvest}
          loading={loading}
          emphasize
          drillDown={plan?.drillDown ?? []}
        />
        <KpiCard
          title="Approved budget"
          amount={plan?.approvedBudget}
          loading={loading}
          drillDown={plan?.drillDown ?? []}
        />
      </Box>

      {!loading && plan ? (
        <Alert
          severity={
            directors.length < 2
              ? 'info'
              : plan.directorsEqual
                ? 'success'
                : 'warning'
          }
        >
          {directors.length < 2
            ? 'Add director capital participants on project Edit → Capital & profit plan to track equal funding.'
            : plan.directorsEqual
              ? plan.equalDirectorInvestment
                ? 'Director expected investments are equal (equal-investment plan is on).'
                : 'Director expected investments happen to be equal.'
              : plan.equalDirectorInvestment
                ? 'Equal-investment plan is on, but expected amounts are not equal — review project Edit.'
                : 'Director expected investments are not equal.'}
        </Alert>
      ) : null}

      {!loading && directors.length > 0 ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'auto',
          }}
        >
          <Typography variant="subtitle2" sx={{ px: 2, pt: 1.5 }}>
            Directors
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Director</TableCell>
                <TableCell align="right">Profit %</TableCell>
                <TableCell align="right">Budget share</TableCell>
                <TableCell align="right">Invested till now</TableCell>
                <TableCell align="right">Still to invest</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {directors.map((row) => (
                <TableRow key={row.participantRecordId}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">
                    {formatPercent(row.profitSharePercent)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.expectedAmount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.investedAmount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.pendingAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {!loading && investors.length > 0 ? (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            overflow: 'auto',
          }}
        >
          <Typography variant="subtitle2" sx={{ px: 2, pt: 1.5 }}>
            Investors
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Investor</TableCell>
                <TableCell align="right">Budget %</TableCell>
                <TableCell align="right">Profit %</TableCell>
                <TableCell align="right">Budget share</TableCell>
                <TableCell align="right">Invested till now</TableCell>
                <TableCell align="right">Still to invest</TableCell>
                <TableCell>Repayment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {investors.map((row) => (
                <TableRow key={row.participantRecordId}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell align="right">
                    {formatPercent(row.budgetPercent)}
                  </TableCell>
                  <TableCell align="right">
                    {formatPercent(row.profitSharePercent)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.expectedAmount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.investedAmount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatOptionalMoney(row.pendingAmount)}
                  </TableCell>
                  <TableCell>{row.repayHint ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {!loading && plan && directors.length === 0 && investors.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No capital participants yet. Set directors (and optional investors) on
          project Edit → Capital & profit plan.
        </Typography>
      ) : null}

      {!loading && plan?.drillDown?.length ? (
        <DrillDownNav links={plan.drillDown} />
      ) : null}
    </Stack>
  );
}
