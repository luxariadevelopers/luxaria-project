import { Box, Skeleton, Typography } from '@mui/material';
import { DrillDownNav } from './DrillDownNav';
import { formatOptionalMoney, hasMetric } from './formatMoney';
import type { DrillDownLink, ProjectDashboardCostSummary } from './types';

type CardProps = {
  title: string;
  amount?: number | null;
  loading?: boolean;
  drillDown?: readonly DrillDownLink[];
  emphasize?: boolean;
};

export function CostSummaryCard({
  title,
  amount,
  loading = false,
  drillDown = [],
  emphasize = false,
}: CardProps) {
  return (
    <Box
      data-testid="cost-forecast-card"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: emphasize ? 'warning.light' : 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      {loading ? (
        <Skeleton width="60%" height={36} sx={{ mt: 0.5 }} />
      ) : (
        <Typography
          variant="h5"
          sx={{ mt: 0.5, fontWeight: 700, letterSpacing: -0.5 }}
        >
          {hasMetric(amount) ? formatOptionalMoney(amount) : '—'}
        </Typography>
      )}
      {!loading ? <DrillDownNav links={drillDown} /> : null}
    </Box>
  );
}

type GridProps = {
  summary: ProjectDashboardCostSummary | null;
  loading?: boolean;
};

export function CostSummaryCards({ summary, loading = false }: GridProps) {
  return (
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
      <CostSummaryCard
        title="Approved budget"
        amount={summary?.approvedBudget.amount}
        loading={loading}
        drillDown={summary?.approvedBudget.drillDown ?? []}
      />
      <CostSummaryCard
        title="Revised budget"
        amount={summary?.revisedBudget.amount}
        loading={loading}
        drillDown={summary?.revisedBudget.drillDown ?? []}
      />
      <CostSummaryCard
        title="Actual cost"
        amount={summary?.actualCost.amount}
        loading={loading}
        drillDown={summary?.actualCost.drillDown ?? []}
      />
      <CostSummaryCard
        title="Committed cost"
        amount={summary?.committedCost.amount}
        loading={loading}
        drillDown={summary?.committedCost.drillDown ?? []}
      />
      <CostSummaryCard
        title="Forecast to complete"
        amount={summary?.forecastCostToComplete.amount}
        loading={loading}
        drillDown={summary?.forecastCostToComplete.drillDown ?? []}
        emphasize
      />
      <CostSummaryCard
        title="Projected final cost"
        amount={summary?.projectedFinalCost.amount}
        loading={loading}
        drillDown={summary?.projectedFinalCost.drillDown ?? []}
        emphasize
      />
    </Box>
  );
}
