import { useQuery } from '@tanstack/react-query';
import { Grid, Stack, Typography } from '@mui/material';
import { fetchInvestorPortalMe, fetchInvestorPortalProjects } from './api';
import {
  CommitmentContributionCards,
  ProfitShareCard,
  ProgressCard,
} from './components/InvestmentCards';
import { ProjectSummaryCard } from './components/ProjectSummaryCard';
import { QueryStatePanel } from './components/QueryStatePanel';

export function InvestorDashboardPage() {
  const meQuery = useQuery({
    queryKey: ['investor-portal', 'me'],
    queryFn: async () => {
      const res = await fetchInvestorPortalMe();
      return res.data ?? null;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['investor-portal', 'projects'],
    queryFn: async () => {
      const res = await fetchInvestorPortalProjects();
      return res.data ?? [];
    },
  });

  const loading = meQuery.isLoading || projectsQuery.isLoading;
  const error = meQuery.error ?? projectsQuery.error;
  const projects = projectsQuery.data ?? [];

  const totals = projects.reduce(
    (acc, project) => ({
      commitment: acc.commitment + project.commitmentAmount,
      contributed: acc.contributed + project.amountContributed,
      pending: acc.pending + project.pendingContribution,
    }),
    { commitment: 0, contributed: 0, pending: 0 },
  );

  const avgProgress =
    projects.length > 0
      ? projects.reduce((sum, p) => sum + p.physicalProgressPercent, 0) /
        projects.length
      : 0;

  const avgProfitShare =
    projects.length > 0
      ? projects.reduce((sum, p) => sum + p.approvedProfitSharePercentage, 0) /
        projects.length
      : 0;

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">Dashboard</Typography>
        <Typography color="text.secondary">
          Authorised project investment summaries for your linked investor
          profile only.
        </Typography>
      </Stack>

      <QueryStatePanel
        loading={loading}
        error={error}
        onRetry={() => {
          void meQuery.refetch();
          void projectsQuery.refetch();
        }}
      >
        {meQuery.data ? (
          <Typography variant="body1" sx={{ mb: 1 }}>
            Welcome, <strong>{meQuery.data.legalName}</strong> (
            {meQuery.data.investorCode})
          </Typography>
        ) : null}

        {projects.length > 0 ? (
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <CommitmentContributionCards
              commitmentAmount={totals.commitment}
              amountContributed={totals.contributed}
              pendingContribution={totals.pending}
            />
            <ProfitShareCard approvedProfitSharePercentage={avgProfitShare} />
            <ProgressCard physicalProgressPercent={avgProgress} />
          </Grid>
        ) : null}

        <Stack spacing={2}>
          <Typography variant="h6">Your projects</Typography>
          {projects.length === 0 ? (
            <QueryStatePanel
              empty
              emptyMessage="No authorised projects are linked to your investor profile yet."
            />
          ) : (
            projects.map((project) => (
              <ProjectSummaryCard key={project.projectId} project={project} />
            ))
          )}
        </Stack>
      </QueryStatePanel>
    </Stack>
  );
}
