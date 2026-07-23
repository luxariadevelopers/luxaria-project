import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/data-table';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicUser } from '@/user-admin/types';
import { useUsersList } from '@/user-admin/useUsers';
import { RoleStatus, type PublicRole } from './types';
import { useReplaceUserRolesFromRbac } from './useRbac';

type Props = {
  role: PublicRole;
  roles: readonly PublicRole[];
  canViewUsers: boolean;
  canAssign: boolean;
};

const usageColumns: GridColDef<PublicUser>[] = [
  { field: 'userCode', headerName: 'Code', width: 130 },
  { field: 'fullName', headerName: 'User', minWidth: 200, flex: 1 },
  {
    field: 'email',
    headerName: 'Email',
    minWidth: 220,
    flex: 1,
    valueFormatter: (value: string | null) => value ?? '—',
  },
  { field: 'status', headerName: 'Status', width: 120 },
];

export function RoleUserAssignmentPanel({
  role,
  roles,
  canViewUsers,
  canAssign,
}: Props) {
  const notify = useNotify();
  const { access } = useAuth();
  const [usagePage, setUsagePage] = useState(1);
  const [usageLimit, setUsageLimit] = useState(20);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<unknown>();

  const usageQuery = useUsersList(
    {
      page: usagePage,
      limit: usageLimit,
      roleId: role.id,
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    canViewUsers,
  );
  const usersQuery = useUsersList(
    {
      page: 1,
      limit: 100,
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    canViewUsers && canAssign,
  );
  const assignmentMutation = useReplaceUserRolesFromRbac();

  const selectedUser = usersQuery.data?.items.find(
    (user) => user.id === selectedUserId,
  );
  const activeRoles = roles.filter(
    (candidate) =>
      candidate.status === RoleStatus.Active &&
      (Boolean(access?.bypassPermissions) ||
        !candidate.bypassPermissions),
  );
  const roleById = useMemo(
    () => new Map(roles.map((candidate) => [candidate.id, candidate])),
    [roles],
  );

  useEffect(() => {
    setSelectedRoleIds(selectedUser?.roleIds ?? []);
  }, [selectedUser]);

  const unavailableCurrentRoleIds = (selectedUser?.roleIds ?? []).filter(
    (roleId) => !activeRoles.some((candidate) => candidate.id === roleId),
  );
  const selectedUserHasBypassRole = (selectedUser?.roleIds ?? []).some(
    (roleId) => roleById.get(roleId)?.bypassPermissions,
  );

  const assign = async () => {
    if (!selectedUserId) return;
    setActionError(undefined);
    try {
      await assignmentMutation.mutateAsync({
        userId: selectedUserId,
        roleIds: selectedRoleIds,
      });
      setConfirmOpen(false);
      notify.success('User roles replaced successfully');
    } catch (error) {
      setConfirmOpen(false);
      setActionError(error);
      notify.error(getErrorMessage(error, 'Role assignment failed'));
    }
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="h6">Role usage</Typography>
            <Typography variant="body2" color="text.secondary">
              Derived from GET /users?roleId={role.id}. There is no dedicated
              RBAC role-usage, assignment-history, or impact-analysis endpoint.
            </Typography>
          </Stack>
          {!canViewUsers ? (
            <Alert severity="info">
              user.view is required to derive role usage from the users list.
            </Alert>
          ) : (
            <DataTable<PublicUser>
              rows={usageQuery.data?.items ?? []}
              columns={usageColumns}
              loading={usageQuery.isLoading || usageQuery.isFetching}
              error={usageQuery.error}
              onRetry={() => void usageQuery.refetch()}
              emptyTitle="Role is not assigned"
              emptyDescription="No current user record contains this role ID."
              paginationMode="server"
              page={usagePage}
              pageSize={usageLimit}
              rowCount={usageQuery.data?.meta?.total ?? 0}
              onPageChange={setUsagePage}
              onPageSizeChange={(limit) => {
                setUsageLimit(limit);
                setUsagePage(1);
              }}
              getRowId={(user) => user.id}
              mobileCard={{
                primaryField: 'fullName',
                metaFields: ['userCode', 'email'],
                statusField: 'status',
              }}
              height={330}
              showColumnVisibility={false}
            />
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h6">Assign roles to a user</Typography>
            <Typography variant="body2" color="text.secondary">
              POST /rbac/users/:userId/roles replaces the complete role list;
              it does not add one role incrementally.
            </Typography>
          </Stack>
          {!canAssign ? (
            <Alert severity="info">
              role.assign is required to change user roles from RBAC
              administration.
            </Alert>
          ) : !canViewUsers ? (
            <Alert severity="info">
              user.view is also required to load each user&apos;s current
              roleIds before a safe full replacement.
            </Alert>
          ) : usersQuery.error ? (
            <Alert severity="error">
              {getErrorMessage(usersQuery.error, 'Users unavailable')}
            </Alert>
          ) : (
            <>
              {(usersQuery.data?.meta?.total ?? 0) > 100 ? (
                <Alert severity="info">
                  The selector shows the first 100 users supported by one list
                  request. Use user administration search for users outside
                  this page.
                </Alert>
              ) : null}
              <FormControl fullWidth>
                <InputLabel id="rbac-user-assignment-label">User</InputLabel>
                <Select
                  labelId="rbac-user-assignment-label"
                  label="User"
                  value={selectedUserId}
                  onChange={(event) =>
                    setSelectedUserId(event.target.value)
                  }
                >
                  {(usersQuery.data?.items ?? []).map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.fullName} · {user.userCode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedUser ? (
                selectedUserHasBypassRole &&
                !access?.bypassPermissions ? (
                  <Alert severity="warning">
                    Only a bypass administrator can change roles for this
                    user.
                  </Alert>
                ) : (
                  <>
                  <FormControl fullWidth>
                    <InputLabel id="rbac-user-role-list-label">
                      Full role assignment
                    </InputLabel>
                    <Select
                      multiple
                      labelId="rbac-user-role-list-label"
                      label="Full role assignment"
                      value={selectedRoleIds}
                      onChange={(event) =>
                        setSelectedRoleIds(
                          typeof event.target.value === 'string'
                            ? event.target.value.split(',')
                            : event.target.value,
                        )
                      }
                    >
                      {unavailableCurrentRoleIds.map((roleId) => (
                        <MenuItem key={roleId} value={roleId}>
                          Current inactive/unavailable role ·{' '}
                          {roleById.get(roleId)?.name ?? roleId}
                        </MenuItem>
                      ))}
                      {activeRoles.map((candidate) => (
                        <MenuItem key={candidate.id} value={candidate.id}>
                          {candidate.name} · {candidate.code}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {actionError ? (
                    <Alert severity="error">
                      {getErrorMessage(
                        actionError,
                        'Role assignment failed',
                      )}
                    </Alert>
                  ) : null}
                  <Button
                    variant="contained"
                    onClick={() => setConfirmOpen(true)}
                    disabled={
                      assignmentMutation.isPending ||
                      JSON.stringify([...selectedRoleIds].sort()) ===
                        JSON.stringify([...selectedUser.roleIds].sort())
                    }
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Replace user roles
                  </Button>
                  </>
                )
              ) : null}
            </>
          )}
        </Stack>
      </Paper>

      <ConfirmDialog
        open={confirmOpen}
        title="Replace all roles for this user?"
        description={`The complete role assignment for ${selectedUser?.fullName ?? 'this user'} will be replaced with ${selectedRoleIds.length} selected role${selectedRoleIds.length === 1 ? '' : 's'}.`}
        confirmLabel="Replace roles"
        destructive={
          selectedUserHasBypassRole ||
          selectedRoleIds.some(
            (roleId) => roleById.get(roleId)?.bypassPermissions,
          )
        }
        loading={assignmentMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void assign()}
      />
    </Stack>
  );
}
