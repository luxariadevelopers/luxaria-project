import { useEffect, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  MissingEntryAlerts,
  SiteActivityCard,
  SiteOperationsFilters,
  TodaysActivityFeed,
  utcTodayIsoDate,
  useSiteOperationsDashboard,
  type SiteOpsFilterState,
} from '@/site-operations-dashboard';

/**
 * Site Operations dashboard (Micro Phase 026).
 *
 * Primary API: `GET /projects/:projectId/dashboard` (`dashboard.view` + project read).
 * Supplemental: DPR / attendance / GRN / petty-cash list & report endpoints.
 *
 * Note: permission catalog has `dashboard.view` only — there is no
 * `dashboard.site.view` in Nest RBAC.
 */
export function SiteOperationsDashboardPage() {
  const { hasPermission, access } = useAuth();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();

  const [filters, setFilters] = useState<SiteOpsFilterState>(() => ({
    date: utcTodayIsoDate(),
    projectId: selectedProjectId ?? '',
  }));

  useEffect(() => {
    if (!filters.projectId && selectedProjectId) {
      setFilters((prev) => ({ ...prev, projectId: selectedProjectId }));
    }
  }, [selectedProjectId, filters.projectId]);

  const canDashboard = Boolean(access) && hasPermission('dashboard.view');
  const canDpr = hasPermission('dpr.view');
  const canAttendance = hasPermission('attendance.view');
  const canGrn = hasPermission('grn.create');
  const canPetty = hasPermission('petty_cash.view');

  const site = useSiteOperationsDashboard({
    projectId: filters.projectId || null,
    date: filters.date,
    canDashboard,
    canDpr,
    canAttendance,
    canGrn,
    canPetty,
  });

  if (access && !canDashboard) {
    return (
      <PermissionDenied
        title="Site Operations unavailable"
        message="You need the dashboard.view permission to open this dashboard."
      />
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No project access"
        description="Select or obtain access to a project before viewing site operations."
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Typography color="text.secondary">
        Site activity for the selected project — DPR, attendance, GRNs, stock and
        petty cash. As-of dates follow the Nest UTC calendar day (same as project
        dashboard / DPR). Missing-DPR alerts appear after the evening cut-off
        evaluation.
      </Typography>

      <SiteOperationsFilters
        value={filters}
        projects={projects}
        onChange={(next) => {
          setFilters(next);
          if (next.projectId && next.projectId !== selectedProjectId) {
            setSelectedProjectId(next.projectId);
          }
        }}
      />

      {site.serverFiltersDate ? (
        <Alert severity="info" variant="outlined">
          Server as-of: <strong>{site.asOfKey}</strong> (from{' '}
          <code>filters.date</code> = {site.serverFiltersDate})
        </Alert>
      ) : null}

      {!filters.projectId ? (
        <EmptyState
          title="Select a project"
          description="Choose a project to load the site operations summary."
        />
      ) : null}

      {site.error ? (
        <RetryPanel error={site.error} onRetry={site.refetchAll} forceRetry />
      ) : null}

      {filters.projectId ? (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: '1fr 1fr 1fr',
              },
            }}
          >
            {site.cards.map((card) => (
              <SiteActivityCard
                key={card.kind}
                card={card}
                loading={site.loading}
              />
            ))}
          </Box>

          <MissingEntryAlerts
            items={site.missingAlerts}
            loading={site.loading}
          />

          <TodaysActivityFeed
            items={site.feed}
            asOfKey={site.asOfKey}
            loading={site.loading}
          />
        </>
      ) : null}
    </Stack>
  );
}
