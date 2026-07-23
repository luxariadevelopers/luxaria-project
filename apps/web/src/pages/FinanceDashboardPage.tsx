import { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { KpiCard } from '@/director-command-centre/KpiCard';
import { formatOptionalMoney } from '@/director-command-centre/formatMetric';
import { useFinancialYearFilterOptions } from '@/director-command-centre/useDirectorCommandCentre';
import { AgeingBucketsCard } from '@/finance-dashboard/AgeingBucketsCard';
import {
  FinanceFilters,
  todayIsoDate,
  toFinanceDashboardQuery,
  type FinanceFilterState,
} from '@/finance-dashboard/FinanceFilters';
import { ProjectFundTable } from '@/finance-dashboard/ProjectFundTable';
import { ReconciliationStatusCard } from '@/finance-dashboard/ReconciliationStatusCard';
import { useFinanceDashboardSummary } from '@/finance-dashboard/useFinanceDashboard';

/**
 * Finance dashboard (Micro Phase 023).
 * API: `GET /finance-dashboard/summary` — permission `dashboard.view`.
 * UI requires a financial year before loading; project filter is optional.
 */
export function FinanceDashboardPage() {
  const { hasPermission, access } = useAuth();
  const { projects } = useProject();
  const [filters, setFilters] = useState<FinanceFilterState>(() => ({
    date: todayIsoDate(),
    projectId: '',
    financialYearId: '',
    horizonDays: '30',
  }));

  const canView = Boolean(access) && hasPermission('dashboard.view');
  const canListFy = hasPermission('financial_year.view');

  const fyQuery = useFinancialYearFilterOptions(canView && canListFy);

  useEffect(() => {
    if (filters.financialYearId || !fyQuery.data?.length) {
      return;
    }
    const current = fyQuery.data.find((fy) => fy.isCurrent) ?? fyQuery.data[0];
    if (current) {
      setFilters((prev) =>
        prev.financialYearId
          ? prev
          : { ...prev, financialYearId: current.id },
      );
    }
  }, [fyQuery.data, filters.financialYearId]);

  const query = useMemo(() => toFinanceDashboardQuery(filters), [filters]);
  const summaryQuery = useFinanceDashboardSummary(query, canView);

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Finance dashboard unavailable"
        message="You need the dashboard.view permission to open the finance workspace."
      />
    );
  }

  const summary = summaryQuery.data;
  const loading = summaryQuery.isLoading || summaryQuery.isFetching;
  const fyReady = Boolean(filters.financialYearId);

  return (
    <Stack spacing={3}>
      <PageHeader
        subtitle="Daily finance workspace — liquidity, payables ageing, receivables, pending postings and reconciliation. Select a financial year to load totals (project filter is optional)."
      />

      <FinanceFilters
        value={filters}
        onChange={setFilters}
        projects={projects}
        financialYears={fyQuery.data ?? []}
        canSelectFinancialYear={canListFy}
      />

      {!canListFy ? (
        <PermissionDenied
          title="Financial year list unavailable"
          message="You need financial_year.view to choose a financial year for this dashboard."
          showHomeLink={false}
        />
      ) : null}

      {canListFy && !fyReady ? (
        <EmptyState
          title="Financial year required"
          description="Select a financial year to load the finance dashboard summary."
        />
      ) : null}

      {fyReady && summaryQuery.isError ? (
        <RetryPanel
          error={summaryQuery.error}
          onRetry={() => void summaryQuery.refetch()}
          forceRetry
        />
      ) : null}

      {fyReady &&
      !summaryQuery.isError &&
      !loading &&
      summary &&
      summary.filters.accessibleProjectCount === 0 ? (
        <EmptyState
          title="No projects in scope"
          description="You have no accessible projects for this filter. Adjust the project filter or request access."
        />
      ) : null}

      {fyReady &&
      !summaryQuery.isError &&
      (loading ||
        (summary && summary.filters.accessibleProjectCount > 0)) ? (
        <>
          {summary?.filters.financialYearName ? (
            <Typography variant="caption" color="text.disabled">
              {summary.filters.financialYearName}
              {' · '}
              {summary.filters.accessibleProjectCount} project
              {summary.filters.accessibleProjectCount === 1 ? '' : 's'}
              {' · horizon '}
              {summary.filters.horizonDays}d
            </Typography>
          ) : null}

          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
            Today&apos;s urgent actions
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: 'repeat(4, 1fr)',
              },
            }}
          >
            <KpiCard
              title="Overdue payments"
              amount={summary?.overduePayments.amount}
              count={summary?.overduePayments.count}
              loading={loading}
              emphasize
              drillDown={summary?.overduePayments.drillDown ?? []}
            />
            <KpiCard
              title="Upcoming payments"
              amount={summary?.upcomingPayments.amount}
              count={summary?.upcomingPayments.count}
              loading={loading}
              emphasize
              drillDown={summary?.upcomingPayments.drillDown ?? []}
            />
            <KpiCard
              title="Payment approvals"
              amount={summary?.paymentApprovals.amount}
              count={summary?.paymentApprovals.count}
              countLabel="pending"
              loading={loading}
              emphasize
              drillDown={summary?.paymentApprovals.drillDown ?? []}
            />
            <KpiCard
              title="Journal errors / pending postings"
              amount={summary?.journalErrors.amount}
              count={summary?.journalErrors.count}
              countLabel="entries"
              loading={loading}
              emphasize
              drillDown={summary?.journalErrors.drillDown ?? []}
            />
          </Box>

          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
            Bank & cash
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
              title="Company bank balances"
              amount={summary?.companyBankBalances.amount}
              count={summary?.companyBankBalances.count}
              countLabel="accounts"
              loading={loading}
              drillDown={summary?.companyBankBalances.drillDown ?? []}
            />
            <KpiCard
              title="Cash balances"
              amount={summary?.cashBalances.amount}
              count={summary?.cashBalances.count}
              countLabel="accounts"
              loading={loading}
              drillDown={summary?.cashBalances.drillDown ?? []}
            />
            <ReconciliationStatusCard
              status={summary?.bankReconciliationPending ?? null}
              loading={loading}
            />
          </Box>

          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
            Payables & receivables
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
          >
            <AgeingBucketsCard
              title="Vendor payables ageing"
              ageing={summary?.vendorAgeing ?? null}
              loading={loading}
            />
            <AgeingBucketsCard
              title="Contractor payables ageing"
              ageing={summary?.contractorAgeing ?? null}
              loading={loading}
            />
          </Box>
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
              title="Customer receivables"
              amount={summary?.customerReceivables.amount}
              count={summary?.customerReceivables.count}
              loading={loading}
              drillDown={summary?.customerReceivables.drillDown ?? []}
            />
            <KpiCard
              title="Director contributions pending"
              amount={summary?.directorContributionPending.pendingAmount}
              count={summary?.directorContributionPending.commitmentCount}
              countLabel="commitments"
              loading={loading}
              drillDown={
                summary?.directorContributionPending.drillDown ?? []
              }
            />
            <KpiCard
              title="Investor contributions pending"
              amount={summary?.investorContributionPending.pendingAmount}
              count={summary?.investorContributionPending.commitmentCount}
              countLabel="commitments"
              loading={loading}
              drillDown={
                summary?.investorContributionPending.drillDown ?? []
              }
            />
            <KpiCard
              title="Unsettled petty cash"
              amount={summary?.unsettledPettyCash.amount}
              count={summary?.unsettledPettyCash.count}
              loading={loading}
              drillDown={summary?.unsettledPettyCash.drillDown ?? []}
            />
          </Box>

          {!loading && summary ? (
            <Typography variant="body2" color="text.secondary">
              Cash-flow forecast ({summary.cashFlowForecast.horizonDays}d):
              inflows{' '}
              {formatOptionalMoney(summary.cashFlowForecast.totalInflows)} ·
              outflows{' '}
              {formatOptionalMoney(summary.cashFlowForecast.totalOutflows)} ·
              net {formatOptionalMoney(summary.cashFlowForecast.net)}
            </Typography>
          ) : null}

          <ProjectFundTable
            rows={summary?.projectFundPosition ?? []}
            loading={loading}
          />
        </>
      ) : null}
    </Stack>
  );
}
