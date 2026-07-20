import { Box, Stack, TextField, Typography } from '@mui/material';
import { KpiCard } from '@/director-command-centre/KpiCard';
import { ProgressBarCell } from '@/director-command-centre/ProgressBarCell';
import { formatOptionalMoney } from '@/director-command-centre/formatMetric';
import type { ProjectDashboardSummary } from '@/director-command-centre/projectDashboardTypes';
import { CriticalAlertsList } from './CriticalAlertsList';
import { SitePhotosStrip } from './SitePhotosStrip';

type Props = {
  summary: ProjectDashboardSummary | undefined;
  loading: boolean;
  asOfDate: string;
  onAsOfDateChange: (date: string) => void;
};

/**
 * Single-project command surface: progress, budget, commitments, ops, cash, photos.
 */
export function ProjectDashboardView({
  summary,
  loading,
  asOfDate,
  onAsOfDateChange,
}: Props) {
  return (
    <Stack spacing={3} data-testid="project-dashboard-view">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <TextField
          size="small"
          type="date"
          label="As-of date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={asOfDate}
          onChange={(e) => onAsOfDateChange(e.target.value)}
          sx={{ minWidth: 160 }}
        />
        {summary ? (
          <Typography variant="body2" color="text.secondary">
            {summary.project.projectCode} · {summary.project.projectName} ·{' '}
            {summary.project.projectStage} · {summary.project.status}
          </Typography>
        ) : null}
      </Stack>

      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Progress
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Physical completion
          </Typography>
          {loading ? null : (
            <ProgressBarCell
              percent={summary?.physicalCompletion.percent}
            />
          )}
        </Box>
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Financial completion
          </Typography>
          {loading ? null : (
            <ProgressBarCell
              percent={summary?.financialCompletion.percent}
            />
          )}
        </Box>
      </Box>

      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Budget & cost
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
          title="Approved budget"
          amount={summary?.approvedBudget.amount}
          loading={loading}
          drillDown={summary?.approvedBudget.drillDown ?? []}
        />
        <KpiCard
          title="Revised budget"
          amount={summary?.revisedBudget.amount}
          loading={loading}
          drillDown={summary?.revisedBudget.drillDown ?? []}
        />
        <KpiCard
          title="Actual cost"
          amount={summary?.actualCost.amount}
          loading={loading}
          drillDown={summary?.actualCost.drillDown ?? []}
        />
        <KpiCard
          title="Committed cost"
          amount={summary?.committedCost.amount}
          loading={loading}
          drillDown={summary?.committedCost.drillDown ?? []}
        />
        <KpiCard
          title="Forecast to complete"
          amount={summary?.forecastCostToComplete.amount}
          loading={loading}
          drillDown={summary?.forecastCostToComplete.drillDown ?? []}
        />
        <KpiCard
          title="Projected final cost"
          amount={summary?.projectedFinalCost.amount}
          loading={loading}
          drillDown={summary?.projectedFinalCost.drillDown ?? []}
        />
      </Box>

      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Funding & cash
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
          title="Investor funding pending"
          amount={summary?.investorFunding.pendingAmount}
          count={summary?.investorFunding.commitmentCount}
          countLabel="commitments"
          loading={loading}
          drillDown={summary?.investorFunding.drillDown ?? []}
        />
        <KpiCard
          title="Customer collections"
          amount={summary?.customerCollections.amount}
          loading={loading}
          drillDown={summary?.customerCollections.drillDown ?? []}
        />
        <KpiCard
          title="Bank balance"
          amount={summary?.bankBalance.amount}
          loading={loading}
          drillDown={summary?.bankBalance.drillDown ?? []}
        />
        <KpiCard
          title="Cash balance"
          amount={summary?.cashBalance.amount}
          loading={loading}
          drillDown={summary?.cashBalance.drillDown ?? []}
        />
        <KpiCard
          title="Vendor dues"
          amount={summary?.vendorDues.amount}
          loading={loading}
          emphasize
          drillDown={summary?.vendorDues.drillDown ?? []}
        />
        <KpiCard
          title="Open POs"
          amount={summary?.purchaseOrders.openBalance}
          count={summary?.purchaseOrders.count}
          countLabel="orders"
          loading={loading}
          drillDown={summary?.purchaseOrders.drillDown ?? []}
        />
      </Box>

      {!loading && summary ? (
        <Typography variant="body2" color="text.secondary">
          Investor committed{' '}
          {formatOptionalMoney(summary.investorFunding.committedAmount)} ·
          received{' '}
          {formatOptionalMoney(summary.investorFunding.receivedAmount)}
        </Typography>
      ) : null}

      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Stock, labour & DPR alerts
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <KpiCard
          title="Material stock SKUs"
          amount={null}
          count={summary?.materialStock.materialCount}
          countLabel="materials"
          loading={loading}
          drillDown={summary?.materialStock.drillDown ?? []}
        />
        <KpiCard
          title="Labour attendance (workers)"
          amount={null}
          count={summary?.labourAttendance.totalWorkers}
          countLabel="workers"
          loading={loading}
          drillDown={summary?.labourAttendance.drillDown ?? []}
        />
      </Box>
      {!loading && summary ? (
        <Typography variant="caption" color="text.secondary">
          Labour as-of {summary.labourAttendance.asOfDate.slice(0, 10)} ·{' '}
          {summary.labourAttendance.confirmedSheets} confirmed /{' '}
          {summary.labourAttendance.sheetCount} sheets · Stock qty{' '}
          {summary.materialStock.totalQuantity} across{' '}
          {summary.materialStock.locations} locations
        </Typography>
      ) : null}

      <CriticalAlertsList
        alerts={summary?.criticalAlerts ?? []}
        loading={loading}
      />

      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        Site photos
      </Typography>
      <SitePhotosStrip
        sitePhotos={summary?.sitePhotos ?? null}
        loading={loading}
      />
    </Stack>
  );
}
