import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityDetailLayout,
  SummaryCards,
} from '@/components/entity-detail';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDate, formatDateTime, formatInr } from '@/format';
import { projectStageLabel, projectTypeLabel } from './constants';
import {
  useProjectActivity,
  useProjectBankOptions,
  useProjectCompany,
  useProjectDetail,
  useProjectUserOptions,
} from './useProjects';
import type { PublicProject } from './types';

type Props = {
  projectId?: string;
};

function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value ?? '—'}</Typography>
    </Stack>
  );
}

function ProjectOverview({
  project,
  managerLabel,
  directorLabels,
  bankLabel,
}: {
  project: PublicProject;
  managerLabel: string;
  directorLabels: string;
  bankLabel: string;
}) {
  const address = [
    project.address.line1,
    project.address.line2,
    project.address.city,
    project.address.state,
    project.address.pincode,
    project.address.country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Project information
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
          }}
        >
          <Fact label="Description" value={project.description ?? '—'} />
          <Fact label="Address" value={address} />
          <Fact
            label="Coordinates"
            value={
              project.latitude != null && project.longitude != null
                ? `${project.latitude}, ${project.longitude}`
                : '—'
            }
          />
          <Fact
            label="Site radius"
            value={
              project.siteRadiusMeters == null
                ? '—'
                : `${project.siteRadiusMeters} m`
            }
          />
          <Fact
            label="Land area"
            value={
              project.landArea == null
                ? '—'
                : `${project.landArea} sq.ft`
            }
          />
          <Fact
            label="Built-up area"
            value={
              project.builtUpArea == null
                ? '—'
                : `${project.builtUpArea} sq.ft`
            }
          />
          <Fact label="Blocks" value={project.numberOfBlocks ?? '—'} />
          <Fact label="Units" value={project.numberOfUnits ?? '—'} />
          <Fact label="Client" value={project.clientName ?? '—'} />
          <Fact label="Currency" value={project.currency || '—'} />
          <Fact label="Time zone" value={project.timeZone || '—'} />
          <Fact label="Default bank" value={bankLabel} />
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Assignments
        </Typography>
        <Stack spacing={1.5}>
          <Fact label="Project manager" value={managerLabel} />
          <Fact label="Assigned directors" value={directorLabels} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          RERA
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}
        >
          <Fact
            label="RERA number"
            value={project.reraDetails.reraNumber ?? '—'}
          />
          <Fact
            label="Authority"
            value={project.reraDetails.authority ?? '—'}
          />
          <Fact
            label="Registration date"
            value={formatDate(project.reraDetails.registrationDate)}
          />
          <Fact
            label="Valid until"
            value={formatDate(project.reraDetails.validUntil)}
          />
          <Fact label="Notes" value={project.reraDetails.notes ?? '—'} />
        </Box>
      </Paper>
    </Stack>
  );
}

export function ProjectDetailPage({ projectId: projectIdProp }: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { user, access, hasPermission } = useAuth();
  const canView = Boolean(access) && hasPermission('project.view');
  const detailQuery = useProjectDetail(projectId, canView);
  const project = detailQuery.data;
  const usersQuery = useProjectUserOptions(
    canView && hasPermission('user.view'),
  );
  const banksQuery = useProjectBankOptions(
    canView && hasPermission('bank.view'),
  );
  const companyQuery = useProjectCompany(
    project?.companyId,
    canView && Boolean(project) && hasPermission('company.view'),
  );
  const activityQuery = useProjectActivity(
    projectId,
    canView && hasPermission('audit.view'),
  );

  const userNameById = useMemo(
    () =>
      new Map(
        (usersQuery.data ?? []).map((user) => [user.id, user.fullName]),
      ),
    [usersQuery.data],
  );
  const bankNameById = useMemo(
    () =>
      new Map(
        (banksQuery.data ?? []).map((bank) => [
          bank.id,
          `${bank.bankName} · ${bank.maskedAccountNumber}`,
        ]),
      ),
    [banksQuery.data],
  );

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!canView || (detailQuery.error && isForbiddenError(detailQuery.error))) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Project unavailable"
        message="You need project.view and explicit access to this project."
      />
    );
  }

  const managerLabel = project?.projectManager
    ? (userNameById.get(project.projectManager) ?? project.projectManager)
    : '—';
  const directorLabels =
    project && project.assignedDirectors.length > 0
      ? project.assignedDirectors
          .map((id) => userNameById.get(id) ?? id)
          .join(', ')
      : '—';

  const summary = project
    ? [
        {
          id: 'type',
          label: 'Type',
          value: projectTypeLabel(project.projectType),
        },
        {
          id: 'stage',
          label: 'Stage',
          value: projectStageLabel(project.projectStage),
        },
        {
          id: 'company',
          label: 'Company',
          value:
            companyQuery.data?.tradeName ||
            companyQuery.data?.legalName ||
            (project.companyId === user?.companyId
              ? 'Authenticated company'
              : null) ||
            project.companyId ||
            '—',
        },
        {
          id: 'start',
          label: 'Start date',
          value: formatDate(project.startDate),
        },
        {
          id: 'expected',
          label: 'Expected completion',
          value: formatDate(project.expectedCompletionDate),
        },
        {
          id: 'budget',
          label: 'Approved budget',
          value:
            project.approvedBudget == null
              ? '—'
              : formatInr(project.approvedBudget),
        },
      ]
    : [];

  return (
    <EntityDetailLayout
      canView={canView}
      loading={detailQuery.isLoading}
      error={detailQuery.error}
      onRetry={() => void detailQuery.refetch()}
      notFound={!detailQuery.isLoading && !detailQuery.error && !project}
      permissionTitle="Project unavailable"
      permissionMessage="You need project.view and explicit project access."
      notFoundTitle="Project not found"
      notFoundDescription="The project may have been removed or the id is invalid."
      header={
        project ? (
          <DetailHeader
            title={project.projectName}
            code={project.projectCode}
            subtitle={project.description ?? undefined}
            backTo="/projects"
            backLabel="Projects"
            meta={
              <Chip
                size="small"
                label={project.status}
                color={
                  project.status === 'Cancelled'
                    ? 'error'
                    : project.status === 'On Hold' ||
                        project.status === 'Archived'
                      ? 'warning'
                      : project.status === 'Completed' ||
                          project.status === 'Closed' ||
                          project.status === 'Active'
                        ? 'success'
                        : 'default'
                }
              />
            }
          />
        ) : undefined
      }
      actionBar={
        project ? (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            {hasPermission('project.update') ? (
              <Button
                component={RouterLink}
                to={`/projects/${project.id}/edit`}
                variant="contained"
              >
                Edit
              </Button>
            ) : null}
            {hasPermission('dashboard.view') ? (
              <Button
                component={RouterLink}
                to={`/projects/${project.id}/dashboard`}
                variant="outlined"
              >
                Dashboard
              </Button>
            ) : null}
            {hasPermission('site.view') ? (
              <Button
                component={RouterLink}
                to={`/projects/${project.id}/structure`}
                variant="outlined"
              >
                Structure
              </Button>
            ) : null}
            {hasPermission('project.view') ? (
              <Button
                component={RouterLink}
                to={`/projects/${project.id}/team`}
                variant="outlined"
              >
                Team
              </Button>
            ) : null}
            {hasPermission('site.view') ? (
              <Button
                component={RouterLink}
                to={`/projects/${project.id}/warehouses`}
                variant="outlined"
              >
                Warehouses
              </Button>
            ) : null}
            {hasPermission('project.update') ? (
              <Button
                component={RouterLink}
                to={`/projects/${project.id}/financial-settings`}
                variant="outlined"
              >
                Financial settings
              </Button>
            ) : null}
            {hasPermission('project_access.view') ? (
              <Button
                component={RouterLink}
                to={`/projects/${project.id}/access`}
                variant="outlined"
              >
                Access
              </Button>
            ) : null}
            <Button
              component={RouterLink}
              to={`/projects/${project.id}/documents`}
              variant="outlined"
            >
              Documents
            </Button>
            {hasPermission('project.update') ? (
              <Button
                component={RouterLink}
                to={`/projects/${project.id}/settings`}
                variant="outlined"
              >
                Settings
              </Button>
            ) : null}
          </Stack>
        ) : undefined
      }
      summary={project ? <SummaryCards fields={summary} /> : undefined}
    >
      {project ? (
        <Stack spacing={2.5}>
          <ProjectOverview
            project={project}
            managerLabel={managerLabel}
            directorLabels={directorLabels}
            bankLabel={
              project.defaultBankAccount
                ? (bankNameById.get(project.defaultBankAccount) ??
                  project.defaultBankAccount)
                : '—'
            }
          />

          {hasPermission('audit.view') ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6">Recent activity</Typography>
              <Typography variant="body2" color="text.secondary">
                Immutable entries from GET /audit-logs?projectId={project.id}.
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              {activityQuery.isLoading ? (
                <Typography color="text.secondary">
                  Loading activity…
                </Typography>
              ) : activityQuery.error ? (
                <RetryPanel
                  error={activityQuery.error}
                  onRetry={() => void activityQuery.refetch()}
                  forceRetry
                />
              ) : (activityQuery.data?.items.length ?? 0) === 0 ? (
                <EmptyState
                  title="No audit activity"
                  description="No audit entries are available for this project."
                />
              ) : (
                <List dense disablePadding>
                  {activityQuery.data?.items.map((entry) => (
                    <ListItem key={entry.id} divider disableGutters>
                      <ListItemText
                        primary={`${entry.action} · ${entry.module}`}
                        secondary={[
                          formatDateTime(entry.timestamp),
                          entry.userId ?? 'System',
                          typeof entry.afterData?.statusChangeNote ===
                          'string'
                            ? entry.afterData.statusChangeNote
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          ) : (
            <Alert severity="info">
              Recent activity is available with audit.view.
            </Alert>
          )}
        </Stack>
      ) : null}
    </EntityDetailLayout>
  );
}
