import { Grid, Paper, Stack, Typography } from '@mui/material';
import {
  InvestorEmptyState,
  InvestorErrorState,
  InvestorForbiddenState,
  InvestorLoadingState,
} from './components/InvestorStatePanel';
import { getErrorMessage, useInvestorPortal } from './InvestorPortalContext';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function InvestorDashboardPage() {
  const {
    profile,
    selectedProject,
    isProfileLoading,
    profileError,
    isProfileForbidden,
    refetchProfile,
    isProjectsLoading,
    projects,
  } = useInvestorPortal();

  if (isProfileLoading || isProjectsLoading) {
    return <InvestorLoadingState title="Loading your investor profile…" />;
  }

  if (isProfileForbidden) {
    return <InvestorForbiddenState />;
  }

  if (profileError) {
    return (
      <InvestorErrorState
        title="Unable to load profile"
        message={getErrorMessage(profileError)}
        onRetry={refetchProfile}
      />
    );
  }

  if (!profile) {
    return (
      <InvestorEmptyState
        title="No investor profile linked"
        message="Contact Luxaria support to link your portal account."
      />
    );
  }

  return (
    <Stack spacing={3} data-testid="investor-dashboard">
      <Stack spacing={0.5}>
        <Typography variant="h4">Welcome, {profile.legalName}</Typography>
        <Typography color="text.secondary">
          Investor code {profile.investorCode} · KYC {profile.kycStatus}
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="overline" color="text.secondary">
              Profile status
            </Typography>
            <Typography variant="h6">{profile.status}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Type: {profile.investorType}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedProject ? (
            <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
              <Typography variant="overline" color="text.secondary">
                Selected project
              </Typography>
              <Typography variant="h6">
                {selectedProject.projectCode} — {selectedProject.projectName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Stage {selectedProject.projectStage} · Physical progress{' '}
                {selectedProject.physicalProgressPercent}%
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Commitment: {formatCurrency(selectedProject.commitmentAmount)}
                </Typography>
                <Typography variant="body2">
                  Contributed: {formatCurrency(selectedProject.amountContributed)}
                </Typography>
                <Typography variant="body2">
                  Pending: {formatCurrency(selectedProject.pendingContribution)}
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <InvestorEmptyState
              title="No project selected"
              message={
                projects.length
                  ? 'Choose a project from the header selector.'
                  : 'You do not have any authorised projects yet.'
              }
            />
          )}
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          Phase 132 shell only — detailed investment views, documents, and reports
          arrive in later phases.
        </Typography>
      </Paper>
    </Stack>
  );
}
