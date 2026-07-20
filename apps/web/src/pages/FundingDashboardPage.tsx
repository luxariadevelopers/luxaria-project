import { useEffect, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { formatInr } from '@/format';
import {
  FundingFilters,
  FundingSummaryCards,
  ParticipantFundingChart,
  UtilisationTable,
  fundingFiltersReady,
  periodFromForDate,
  todayIsoDate,
  useFundingDashboard,
  type FundingFilterState,
} from '@/funding-dashboard';

/**
 * Funding dashboard (Micro Phase 040).
 *
 * Composes:
 * - `GET …/commitments/summary` + list (`contribution_commitment.view`)
 * - `GET …/contribution-receipts/balances` (`contribution_receipt.view`)
 * - `GET /accounting-reports/source-and-utilisation-of-funds` (`report.view`)
 *
 * Catalog has no `funding.dashboard.view` — route uses `dashboard.view`.
 * Project + as-of date filters are required.
 */
export function FundingDashboardPage() {
  const { hasPermission, access } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();

  const [filters, setFilters] = useState<FundingFilterState>(() => ({
    date: todayIsoDate(),
    projectId: selectedProjectId ?? '',
  }));

  useEffect(() => {
    if (!filters.projectId && selectedProjectId) {
      setFilters((prev) => ({ ...prev, projectId: selectedProjectId }));
    }
  }, [selectedProjectId, filters.projectId]);

  const canDashboard = Boolean(access) && hasPermission('dashboard.view');
  const canCommitments = hasPermission('contribution_commitment.view');
  const canBalances = hasPermission('contribution_receipt.view');
  const canUtilisation = hasPermission('report.view');

  const filtersReady = fundingFiltersReady(filters);

  const dash = useFundingDashboard({
    projectId: filtersReady ? filters.projectId : null,
    date: filters.date,
    canCommitments: canDashboard && canCommitments,
    canUtilisation: canDashboard && canUtilisation,
    canBalances: canDashboard && canBalances,
  });

  if (access && !canDashboard) {
    return (
      <PermissionDenied
        title="Funding dashboard unavailable"
        message="You need the dashboard.view permission to open the funding dashboard. (There is no funding.dashboard.view code in the Nest catalog.)"
      />
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No project access"
        description="Select or obtain access to a project before viewing funding and utilisation."
      />
    );
  }

  const periodFrom = periodFromForDate(filters.date);

  return (
    <Stack spacing={3} data-testid="funding-dashboard-page">
      <Typography color="text.secondary">
        Project funding — committed / received / pending gaps by participant,
        plus accounting source and utilisation. Project and as-of date are
        required.
      </Typography>

      <FundingFilters
        value={filters}
        projects={projects}
        onChange={(next) => {
          setFilters(next);
          if (next.projectId && next.projectId !== selectedProjectId) {
            setSelectedProjectId(next.projectId);
          }
        }}
      />

      {!filtersReady ? (
        <EmptyState
          title="Filters required"
          description="Choose an as-of date and a project to load funding totals."
        />
      ) : null}

      {filtersReady &&
      !canCommitments &&
      !canUtilisation &&
      !canBalances ? (
        <PermissionDenied
          title="Funding data unavailable"
          message="You need contribution_commitment.view, contribution_receipt.view, and/or report.view to load dashboard sections."
          showHomeLink={false}
        />
      ) : null}

      {filtersReady && canCommitments && dash.summaryError ? (
        isForbiddenError(dash.summaryError) ? (
          <PermissionDenied
            title="Commitments unavailable"
            message="The server denied access to commitment summary (403)."
            showHomeLink={false}
          />
        ) : (
          <RetryPanel
            error={dash.summaryError}
            onRetry={() => dash.refetchAll()}
            forceRetry
          />
        )
      ) : null}

      {filtersReady && canCommitments && !dash.summaryError ? (
        <>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: 1 }}
          >
            Contribution commitments
          </Typography>
          <FundingSummaryCards
            cards={dash.cards}
            loading={dash.summaryLoading}
          />
          {dash.balances && !dash.balancesError ? (
            <Alert severity="info" variant="outlined">
              Posted contribution receipts (balance ledger):{' '}
              {formatInr(dash.balances.project.receivedAmount)} across{' '}
              {dash.balances.project.postedReceiptCount} receipt(s).
            </Alert>
          ) : null}
          <ParticipantFundingChart
            rows={dash.participantRows}
            loading={dash.commitmentsLoading}
          />
        </>
      ) : null}

      {filtersReady && canUtilisation && dash.utilisationError ? (
        isForbiddenError(dash.utilisationError) ? (
          <PermissionDenied
            title="Utilisation unavailable"
            message="The server denied access to the source and utilisation report (403)."
            showHomeLink={false}
          />
        ) : (
          <RetryPanel
            error={dash.utilisationError}
            onRetry={() => dash.refetchAll()}
            forceRetry
          />
        )
      ) : null}

      {filtersReady && canUtilisation && !dash.utilisationError ? (
        <UtilisationTable
          report={dash.utilisation}
          loading={dash.utilisationLoading}
          periodLabel={`${periodFrom} → ${filters.date}`}
        />
      ) : null}

      {filtersReady && !canUtilisation && canCommitments ? (
        <Alert severity="warning" variant="outlined">
          Utilisation by source requires report.view. Commitment totals above
          still load with contribution_commitment.view.
        </Alert>
      ) : null}
    </Stack>
  );
}
