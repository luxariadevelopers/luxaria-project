import { useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { CashPositionSection } from '@/director-command-centre/CashPositionSection';
import { CriticalAlertsPanel } from '@/director-command-centre/CriticalAlertsPanel';
import {
  DirectorFilters,
  todayIsoDate,
  toCommandCentreQuery,
  type DirectorFilterState,
} from '@/director-command-centre/DirectorFilters';
import { KpiCard } from '@/director-command-centre/KpiCard';
import { PendingApprovalsCard } from '@/director-command-centre/PendingApprovalsCard';
import { ProjectPerformanceSection } from '@/director-command-centre/ProjectPerformanceSection';
import { ProjectSummarySection } from '@/director-command-centre/ProjectSummarySection';
import {
  useDirectorCommandCentreSummary,
  useDirectorFilterOptions,
  useFinancialYearFilterOptions,
} from '@/director-command-centre/useDirectorCommandCentre';
import { formatOptionalMoney } from '@/director-command-centre/formatMetric';

/**
 * Director Command Centre (Micro Phases 021–022).
 * APIs: `GET /director-command-centre/summary`,
 * `GET /projects/:projectId/dashboard` — permission `dashboard.view`.
 */
export function DirectorCommandCentrePage() {
  const { hasPermission, access } = useAuth();
  const { projects } = useProject();
  const [filters, setFilters] = useState<DirectorFilterState>(() => ({
    date: todayIsoDate(),
    projectId: '',
    directorId: '',
    financialYearId: '',
  }));

  const canView =
    Boolean(access) &&
    (hasPermission('dashboard.view') ||
      hasPermission('analytics.dashboard.view'));
  const canListDirectors = hasPermission('director.view');
  const canListFy = hasPermission('financial_year.view');

  const query = useMemo(() => toCommandCentreQuery(filters), [filters]);
  const summaryQuery = useDirectorCommandCentreSummary(query, canView);
  const directorsQuery = useDirectorFilterOptions(canView && canListDirectors);
  const fyQuery = useFinancialYearFilterOptions(canView && canListFy);

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Director Command Centre unavailable"
        message="You need dashboard.view or analytics.dashboard.view to open this summary."
      />
    );
  }

  const summary = summaryQuery.data;
  const loading = summaryQuery.isLoading;
  const applied = summary?.filters;

  return (
    <Stack spacing={3}>
      <PageHeader
        subtitle="Executive summary across accessible projects — balances, payables, progress and exceptions. Metrics come from the API; missing values show as — (not invented zeros)."
      />

      <DirectorFilters
        value={filters}
        onChange={setFilters}
        projects={projects}
        directors={directorsQuery.data ?? []}
        financialYears={fyQuery.data ?? []}
        showDirectorFilter={canListDirectors}
        showFinancialYearFilter={canListFy}
      />

      {applied ? (
        <Typography variant="caption" color="text.disabled">
          Scope: {applied.accessibleProjectCount} project
          {applied.accessibleProjectCount === 1 ? '' : 's'}
          {applied.financialYearName
            ? ` · ${applied.financialYearName}`
            : ''}
          {applied.rangeFrom && applied.rangeTo
            ? ` · ${applied.rangeFrom.slice(0, 10)} → ${applied.rangeTo.slice(0, 10)}`
            : ''}
        </Typography>
      ) : null}

      {summaryQuery.isError ? (
        <RetryPanel
          error={summaryQuery.error}
          onRetry={() => void summaryQuery.refetch()}
          forceRetry
        />
      ) : null}

      {!summaryQuery.isError &&
      !loading &&
      summary &&
      summary.filters.accessibleProjectCount === 0 ? (
        <EmptyState
          title="No projects in scope"
          description="You have no accessible projects for this filter (or the selected director has no participation). Adjust filters or request project access."
        />
      ) : null}

      {!summaryQuery.isError &&
      (loading ||
        (summary && summary.filters.accessibleProjectCount > 0)) ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
            }}
          >
            <KpiCard
              title="Vendor payable"
              amount={summary?.vendorPayable.amount}
              count={summary?.vendorPayable.count}
              countLabel="invoices"
              loading={loading}
              drillDown={summary?.vendorPayable.drillDown ?? []}
            />
            <KpiCard
              title="Contractor payable"
              amount={summary?.contractorPayable.amount}
              count={summary?.contractorPayable.count}
              countLabel="bills"
              loading={loading}
              drillDown={summary?.contractorPayable.drillDown ?? []}
            />
            <KpiCard
              title="Payments due today"
              amount={summary?.paymentsDueToday.amount}
              count={summary?.paymentsDueToday.count}
              loading={loading}
              emphasize
              drillDown={summary?.paymentsDueToday.drillDown ?? []}
            />
            <KpiCard
              title="Overdue payments"
              amount={summary?.overduePayments.amount}
              count={summary?.overduePayments.count}
              loading={loading}
              emphasize
              drillDown={summary?.overduePayments.drillDown ?? []}
            />
            <KpiCard
              title="Customer collections"
              amount={summary?.customerCollections.amount}
              count={summary?.customerCollections.count}
              loading={loading}
              drillDown={summary?.customerCollections.drillDown ?? []}
            />
            <PendingApprovalsCard
              tile={summary?.purchaseRequestsPending ?? null}
              loading={loading}
            />
            <KpiCard
              title="Director contributions (pending)"
              amount={summary?.directorContributionSummary.pendingAmount}
              count={summary?.directorContributionSummary.commitmentCount}
              countLabel="commitments"
              loading={loading}
              drillDown={
                summary?.directorContributionSummary.drillDown ?? []
              }
            />
            <KpiCard
              title="Investor contributions (pending)"
              amount={summary?.investorContributionSummary.pendingAmount}
              count={summary?.investorContributionSummary.commitmentCount}
              countLabel="commitments"
              loading={loading}
              drillDown={
                summary?.investorContributionSummary.drillDown ?? []
              }
            />
          </Box>

          {!loading && summary ? (
            <Typography variant="body2" color="text.secondary">
              Director committed{' '}
              {formatOptionalMoney(
                summary.directorContributionSummary.committedAmount,
              )}{' '}
              · received{' '}
              {formatOptionalMoney(
                summary.directorContributionSummary.receivedAmount,
              )}
              {' · '}
              Investor committed{' '}
              {formatOptionalMoney(
                summary.investorContributionSummary.committedAmount,
              )}{' '}
              · received{' '}
              {formatOptionalMoney(
                summary.investorContributionSummary.receivedAmount,
              )}
            </Typography>
          ) : null}

          <CriticalAlertsPanel
            exceptions={summary?.criticalExceptions ?? []}
            materialAlerts={summary?.materialStockAlerts ?? null}
            labourAlerts={summary?.labourShortfall ?? null}
            loading={loading}
          />

          <CashPositionSection
            bankTotal={summary?.totalCompanyBankBalance ?? null}
            cashTotal={summary?.totalCashBalance ?? null}
            projectBank={summary?.projectWiseBankBalance ?? []}
            projectPetty={summary?.projectWisePettyCash ?? []}
            loading={loading}
          />

          <ProjectSummarySection
            costVersusBudget={summary?.costVersusBudget ?? []}
            physicalProgress={summary?.physicalProgress ?? []}
            boqUtilisation={summary?.boqUtilisation ?? []}
            loading={loading}
          />
        </>
      ) : null}

      {canView ? (
        <ProjectPerformanceSection
          projects={projects}
          projectIdFilter={filters.projectId || undefined}
          dashboardQuery={{
            date: filters.date || undefined,
            from: summary?.filters.rangeFrom ?? undefined,
            to: summary?.filters.rangeTo ?? undefined,
          }}
          canView={canView}
        />
      ) : null}
    </Stack>
  );
}
