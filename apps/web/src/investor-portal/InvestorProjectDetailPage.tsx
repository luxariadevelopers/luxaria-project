import { Link as RouterLink, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Chip, Grid, Stack, Typography } from '@mui/material';
import {
  getInvestorAccessDeniedMessage,
  isProjectAccessDenied,
  isProjectAuthorised,
} from './access';
import { fetchInvestorPortalProject, fetchInvestorPortalProjects } from './api';
import {
  CommitmentContributionCards,
  ProfitShareCard,
  ProgressCard,
  UtilisationCard,
} from './components/InvestmentCards';
import { QueryStatePanel } from './components/QueryStatePanel';
import { formatInr } from './format';

export function InvestorProjectDetailPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();

  const projectsQuery = useQuery({
    queryKey: ['investor-portal', 'projects'],
    queryFn: async () => {
      const res = await fetchInvestorPortalProjects();
      return res.data ?? [];
    },
  });

  const authorisedIds = (projectsQuery.data ?? []).map((p) => p.projectId);
  const clientAuthorised = isProjectAuthorised(projectId, authorisedIds);

  const detailQuery = useQuery({
    queryKey: ['investor-portal', 'project', projectId],
    queryFn: async () => {
      const res = await fetchInvestorPortalProject(projectId);
      return res.data ?? null;
    },
    enabled: Boolean(projectId) && clientAuthorised,
    retry: (failureCount, error) =>
      !isProjectAccessDenied(error) && failureCount < 1,
  });

  const loading =
    projectsQuery.isLoading ||
    (clientAuthorised && detailQuery.isLoading && !detailQuery.isError);
  const forbidden =
    !projectsQuery.isLoading &&
    projectId.length > 0 &&
    (!clientAuthorised || isProjectAccessDenied(detailQuery.error));
  const error =
    !forbidden && !loading
      ? projectsQuery.error ?? detailQuery.error
      : undefined;

  const detail = detailQuery.data;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1,
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4">Project summary</Typography>
          <Typography color="text.secondary">
            Investment, progress and budget utilisation for your participation
            only.
          </Typography>
        </Stack>
        <Button component={RouterLink} to="/investor/dashboard" variant="outlined">
          Back to dashboard
        </Button>
      </Stack>

      <QueryStatePanel
        loading={loading}
        error={error}
        forbidden={forbidden}
        forbiddenMessage={getInvestorAccessDeniedMessage(
          detailQuery.error,
          'This project is not linked to your investor profile.',
        )}
        onRetry={() => {
          void projectsQuery.refetch();
          if (clientAuthorised) {
            void detailQuery.refetch();
          }
        }}
      >
        {detail ? (
          <>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              <Typography variant="h5">
                {detail.project.projectCode} — {detail.project.projectName}
              </Typography>
              <Chip size="small" label={detail.project.projectStage} />
              <Chip size="small" label={detail.project.status} variant="outlined" />
            </Stack>

            <Grid container spacing={2}>
              <CommitmentContributionCards
                commitmentAmount={detail.investment.commitmentAmount}
                amountContributed={detail.investment.amountContributed}
                pendingContribution={detail.investment.pendingContribution}
              />
              <ProfitShareCard
                approvedProfitSharePercentage={
                  detail.investment.approvedProfitSharePercentage
                }
              />
              <ProgressCard
                physicalProgressPercent={detail.progress.physicalProgressPercent}
                plannedQuantity={detail.progress.plannedQuantity}
                measuredQuantity={detail.progress.measuredQuantity}
              />
              <UtilisationCard
                approvedBudget={detail.budget.approvedBudget}
                revisedBudget={detail.budget.revisedBudget}
                fundsUtilised={detail.budget.fundsUtilised}
                utilisationPercent={detail.budget.utilisationPercent}
              />
            </Grid>

            <Stack spacing={1}>
              <Typography variant="h6">Profit allocation</Typography>
              <Typography variant="body2" color="text.secondary">
                Allocated {formatInr(detail.profit.allocatedAmount)} ·
                Distributed {formatInr(detail.profit.distributedProfit)} ·
                Undistributed {formatInr(detail.profit.undistributedProfit)}
              </Typography>
            </Stack>
          </>
        ) : null}
      </QueryStatePanel>
    </Stack>
  );
}
