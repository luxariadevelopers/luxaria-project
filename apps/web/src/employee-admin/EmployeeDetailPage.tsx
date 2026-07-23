import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate } from '@/format';
import { PageHeader } from '@/layouts/PageHeader';
import { useUsersList } from '@/user-admin/useUsers';
import { EmployeeAccessPage } from './EmployeeAccessPage';
import { canOpenEmployees } from './roleAccess';
import { EmployeeStatus } from './types';
import {
  useDeactivateEmployee,
  useDepartmentsList,
  useDesignationsList,
  useEmployeeDetail,
} from './useEmployees';

type Props = {
  employeeId?: string;
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

function statusColor(
  status: string,
): 'success' | 'warning' | 'error' | 'default' | 'info' {
  if (status === EmployeeStatus.Active) return 'success';
  if (status === EmployeeStatus.Suspended || status === EmployeeStatus.Terminated)
    return 'error';
  if (status === EmployeeStatus.Invited || status === EmployeeStatus.OnLeave)
    return 'info';
  if (status === EmployeeStatus.Draft) return 'warning';
  return 'default';
}

export function EmployeeDetailPage({
  employeeId: employeeIdProp,
}: Props = {}) {
  const params = useParams<{ employeeId: string }>();
  const employeeId = employeeIdProp ?? params.employeeId;
  const navigate = useNavigate();
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canView = canOpenEmployees(access);
  const employeeQuery = useEmployeeDetail(employeeId, canView);
  const departmentsQuery = useDepartmentsList(
    canView && hasPermission('department.view'),
  );
  const designationsQuery = useDesignationsList(
    canView && hasPermission('designation.view'),
  );
  const managersQuery = useUsersList(
    {
      page: 1,
      limit: 100,
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    canView && hasPermission('user.view'),
  );
  const deactivateMutation = useDeactivateEmployee(employeeId ?? '');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [actionError, setActionError] = useState<unknown>();

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canView ||
    (employeeQuery.error && isForbiddenError(employeeQuery.error))
  ) {
    return (
      <PermissionDenied
        error={employeeQuery.error}
        title="Employee unavailable"
        message="You need employee.view to open this employee."
      />
    );
  }

  const employee = employeeQuery.data;
  const departmentName =
    (departmentsQuery.data ?? []).find((d) => d.id === employee?.departmentId)
      ?.name ?? employee?.departmentId;
  const designationName =
    (designationsQuery.data ?? []).find((d) => d.id === employee?.designationId)
      ?.name ?? employee?.designationId;
  const managerName = employee?.reportingManagerUserId
    ? ((managersQuery.data?.items ?? []).find(
        (u) => u.id === employee.reportingManagerUserId,
      )?.fullName ?? employee.reportingManagerUserId)
    : '—';

  const runDeactivate = async () => {
    setActionError(undefined);
    try {
      await deactivateMutation.mutateAsync();
      notify.success('Employee deactivated');
      setConfirmDeactivate(false);
    } catch (error) {
      setConfirmDeactivate(false);
      setActionError(error);
      notify.error(getErrorMessage(error, 'Deactivation failed'));
    }
  };

  const summary = employee
    ? [
        { id: 'status', label: 'Status', value: employee.status },
        {
          id: 'department',
          label: 'Department',
          value: departmentName ?? '—',
        },
        {
          id: 'designation',
          label: 'Designation',
          value: designationName ?? '—',
        },
        {
          id: 'login',
          label: 'Login user',
          value: employee.userId ? 'Linked' : 'None',
        },
      ]
    : [];

  const actions = useMemo<EntityDetailAction[]>(() => {
    if (!employee) return [];
    return [
      {
        id: 'access',
        label: 'Access',
        permission: 'employee.view',
        allowedStatuses: Object.values(EmployeeStatus),
        variant: 'outlined',
        onClick: () =>
          void navigate(`/administration/employees/${employee.id}/access`),
      },
      {
        id: 'deactivate',
        label: 'Deactivate',
        permission: 'employee.deactivate',
        allowedStatuses: [EmployeeStatus.Active],
        color: 'warning',
        variant: 'outlined',
        onClick: () => setConfirmDeactivate(true),
      },
    ];
  }, [employee, navigate]);

  return (
    <>
      <PageHeader hideTitle />
      <EntityDetailLayout
        canView={canView}
        loading={employeeQuery.isLoading}
        error={employeeQuery.error}
        onRetry={() => void employeeQuery.refetch()}
        notFound={!employeeQuery.isLoading && !employeeQuery.error && !employee}
        permissionTitle="Employee unavailable"
        permissionMessage="You need employee.view to open this employee."
        notFoundTitle="Employee not found"
        notFoundDescription="The employee may have been deleted or the id is invalid."
        header={
          employee ? (
            <DetailHeader
              title={employee.displayName}
              code={employee.employeeCode}
              subtitle={employee.email}
              backTo="/administration/employees"
              backLabel="Employees"
              meta={
                <Chip
                  size="small"
                  label={employee.status}
                  color={statusColor(employee.status)}
                  variant="outlined"
                />
              }
            />
          ) : null
        }
        actionBar={
          employee ? (
            <EntityActionBar
              actions={actions}
              status={employee.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
      >
        {employee ? (
          <Stack spacing={2.5} data-testid="employee-detail-page">
            {actionError ? (
              <Typography color="error" variant="body2">
                {getErrorMessage(actionError, 'Action failed')}
              </Typography>
            ) : null}
            <SummaryCards fields={summary} />
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle1">Profile</Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={3}
                  useFlexGap
                  sx={{ flexWrap: 'wrap' }}
                >
                  <Fact label="First name" value={employee.firstName} />
                  <Fact label="Last name" value={employee.lastName} />
                  <Fact label="Display name" value={employee.displayName} />
                  <Fact label="Email" value={employee.email} />
                  <Fact label="Mobile" value={employee.mobile ?? '—'} />
                  <Fact label="Department" value={departmentName} />
                  <Fact label="Designation" value={designationName} />
                  <Fact label="Reporting manager" value={managerName} />
                  <Fact
                    label="Employment type"
                    value={employee.employmentType}
                  />
                  <Fact
                    label="Joining date"
                    value={formatDate(employee.joiningDate)}
                  />
                  <Fact
                    label="User id"
                    value={employee.userId ?? '—'}
                  />
                </Stack>
              </Stack>
            </Paper>

            <Stack spacing={1}>
              <Typography variant="subtitle1">Access summary</Typography>
              <EmployeeAccessPage employeeId={employee.id} embedded />
            </Stack>
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate employee?"
        description="The employee will be suspended and may lose login eligibility."
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => void runDeactivate()}
      />
    </>
  );
}
