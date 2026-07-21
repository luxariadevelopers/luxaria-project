import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityDetailLayout,
  SummaryCards,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useProjectsList } from '@/projects/useProjects';
import { canOpenEmployees } from './roleAccess';
import type { EmployeeAccessSummary } from './types';
import { useEmployeeAccess, useSitesList } from './useEmployees';

type AccessSummaryProps = {
  summary: EmployeeAccessSummary;
  projectNames: Map<string, string>;
  siteNames: Map<string, string>;
  compact?: boolean;
};

export function EmployeeAccessSummaryPanel({
  summary,
  projectNames,
  siteNames,
  compact = false,
}: AccessSummaryProps) {
  return (
    <Stack spacing={2} data-testid="employee-access-summary">
      <SummaryCards
        fields={[
          {
            id: 'roles',
            label: 'Roles',
            value: summary.roles.length,
          },
          {
            id: 'projects',
            label: 'Projects',
            value: summary.projects.length,
          },
          {
            id: 'sites',
            label: 'Sites',
            value: summary.sites.length,
          },
          {
            id: 'overrides',
            label: 'Overrides',
            value: summary.overrides.length,
          },
        ]}
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Roles</Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {summary.roles.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No roles assigned
                {!summary.employee.userId
                  ? ' (employee has no login user)'
                  : ''}
              </Typography>
            ) : (
              summary.roles.map((role) => (
                <Chip
                  key={role.id}
                  size="small"
                  label={`${role.name} (${role.code})`}
                />
              ))
            )}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Projects</Typography>
          {summary.projects.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No project access
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {summary.projects.map((projectId) => (
                <Chip
                  key={projectId}
                  size="small"
                  variant="outlined"
                  label={projectNames.get(projectId) ?? projectId}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Sites</Typography>
          {summary.sites.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No site access
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {summary.sites.map((siteId) => (
                <Chip
                  key={siteId}
                  size="small"
                  variant="outlined"
                  label={siteNames.get(siteId) ?? siteId}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      {!compact ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1">Permission overrides</Typography>
            {summary.overrides.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No active overrides
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Permission</TableCell>
                    <TableCell>Effect</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Site</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.overrides.map((row, index) => (
                    <TableRow key={`${row.permission}-${index}`}>
                      <TableCell>{row.permission}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.effect}
                          color={row.effect === 'deny' ? 'error' : 'success'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {row.projectId
                          ? (projectNames.get(row.projectId) ?? row.projectId)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {row.siteId
                          ? (siteNames.get(row.siteId) ?? row.siteId)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </Paper>
      ) : summary.overrides.length > 0 ? (
        <Alert severity="info">
          {summary.overrides.length} active permission override
          {summary.overrides.length === 1 ? '' : 's'}. Open Access for the full
          matrix.
        </Alert>
      ) : null}
    </Stack>
  );
}

type Props = {
  employeeId?: string;
  embedded?: boolean;
};

export function EmployeeAccessPage({
  employeeId: employeeIdProp,
  embedded = false,
}: Props = {}) {
  const params = useParams<{ employeeId: string }>();
  const employeeId = employeeIdProp ?? params.employeeId;
  const { access, hasPermission } = useAuth();
  const canView = canOpenEmployees(access);
  const accessQuery = useEmployeeAccess(employeeId, canView);
  const projectsQuery = useProjectsList(
    { page: 1, limit: 100, sortBy: 'projectName', sortOrder: 'asc' },
    canView && hasPermission('project.view'),
  );
  const sitesQuery = useSitesList(
    { page: 1, limit: 200 },
    canView && hasPermission('site.view'),
  );

  const projectNames = new Map(
    (projectsQuery.data?.items ?? []).map((row) => [row.id, row.projectName]),
  );
  const siteNames = new Map(
    (sitesQuery.data?.items ?? []).map((row) => [
      row.id,
      `${row.siteName} (${row.siteCode})`,
    ]),
  );

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canView ||
    (accessQuery.error && isForbiddenError(accessQuery.error))
  ) {
    return (
      <PermissionDenied
        error={accessQuery.error}
        title="Employee access unavailable"
        message="You need employee.view to open employee access."
      />
    );
  }

  const summary = accessQuery.data;

  if (embedded) {
    if (accessQuery.isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      );
    }
    if (accessQuery.error) {
      return (
        <Alert severity="error">
          Could not load access summary. Retry from the Access page.
        </Alert>
      );
    }
    if (!summary) return null;
    return (
      <EmployeeAccessSummaryPanel
        summary={summary}
        projectNames={projectNames}
        siteNames={siteNames}
        compact
      />
    );
  }

  return (
    <EntityDetailLayout
      canView={canView}
      loading={accessQuery.isLoading}
      error={accessQuery.error}
      onRetry={() => void accessQuery.refetch()}
      notFound={!accessQuery.isLoading && !accessQuery.error && !summary}
      permissionTitle="Employee access unavailable"
      permissionMessage="You need employee.view to open this employee."
      notFoundTitle="Employee not found"
      notFoundDescription="The employee may have been deleted or the id is invalid."
      header={
        summary ? (
          <DetailHeader
            title={summary.employee.displayName}
            code={summary.employee.employeeCode}
            subtitle="Access matrix"
            backTo={`/administration/employees/${summary.employee.id}`}
            backLabel="Employee"
          />
        ) : null
      }
    >
      {summary ? (
        <Stack spacing={2} data-testid="employee-access-page">
          <EmployeeAccessSummaryPanel
            summary={summary}
            projectNames={projectNames}
            siteNames={siteNames}
          />
        </Stack>
      ) : null}
    </EntityDetailLayout>
  );
}
