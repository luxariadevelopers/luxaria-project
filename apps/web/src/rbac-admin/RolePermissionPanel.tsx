import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useNotify } from '@/components/NotificationProvider';
import { PermissionChecklist } from './PermissionChecklist';
import type { PermissionCatalogItem, PublicRole } from './types';
import { useReplaceRolePermissions } from './useRbac';

type Props = {
  role: PublicRole;
  catalog?: readonly PermissionCatalogItem[];
  catalogError?: unknown;
  canViewCatalog: boolean;
  canUpdate: boolean;
};

export function RolePermissionPanel({
  role,
  catalog,
  catalogError,
  canViewCatalog,
  canUpdate,
}: Props) {
  const notify = useNotify();
  const mutation = useReplaceRolePermissions(role.id);
  const [selected, setSelected] = useState<string[]>(role.permissions);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<unknown>();

  useEffect(() => {
    setSelected(role.permissions);
  }, [role.permissions]);

  const catalogCodes = useMemo(
    () => new Set((catalog ?? []).map((permission) => permission.code)),
    [catalog],
  );
  const unavailableCodes = selected.filter(
    (permission) => !catalogCodes.has(permission),
  );
  const unchanged =
    JSON.stringify([...selected].sort()) ===
    JSON.stringify([...role.permissions].sort());

  const save = async () => {
    if (unavailableCodes.length > 0) return;
    setActionError(undefined);
    try {
      await mutation.mutateAsync(selected);
      setConfirmOpen(false);
      notify.success('Role permissions replaced successfully');
    } catch (error) {
      setConfirmOpen(false);
      setActionError(error);
      notify.error(getErrorMessage(error, 'Permission assignment failed'));
    }
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.25}>
            <Typography variant="h6">Permissions</Typography>
            <Typography variant="body2" color="text.secondary">
              Saving calls the full-replace POST /rbac/roles/:id/permissions
              endpoint.
            </Typography>
          </Stack>

          {!canViewCatalog ? (
            <>
              <Alert severity="info">
                permission.view is required to load the canonical catalog.
                Existing role permission codes remain visible below.
              </Alert>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap' }}
              >
                {role.permissions.length === 0 ? (
                  <Typography color="text.secondary">
                    No permissions assigned
                  </Typography>
                ) : (
                  role.permissions.map((permission) => (
                    <Chip
                      key={permission}
                      label={permission}
                      size="small"
                      variant="outlined"
                    />
                  ))
                )}
              </Stack>
            </>
          ) : catalogError ? (
            <Alert severity="error">
              {getErrorMessage(
                catalogError,
                'Permission catalog unavailable',
              )}
            </Alert>
          ) : catalog ? (
            <>
              {unavailableCodes.length > 0 ? (
                <Alert
                  severity="warning"
                  action={
                    canUpdate ? (
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() =>
                          setSelected((current) =>
                            current.filter((code) => catalogCodes.has(code)),
                          )
                        }
                      >
                        Remove unavailable
                      </Button>
                    ) : undefined
                  }
                >
                  {unavailableCodes.length} selected permission code
                  {unavailableCodes.length === 1 ? ' is' : 's are'} absent
                  from the current catalog. Remove them explicitly before
                  saving; the server rejects unknown codes.
                </Alert>
              ) : null}
              <PermissionChecklist
                catalog={catalog}
                value={selected}
                disabled={!canUpdate || mutation.isPending}
                onChange={setSelected}
              />
              {!canUpdate ? (
                <Alert severity="info">
                  role.update is required to replace permissions.
                </Alert>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => setConfirmOpen(true)}
                  disabled={
                    unchanged ||
                    mutation.isPending ||
                    unavailableCodes.length > 0
                  }
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Save permission replacement
                </Button>
              )}
            </>
          ) : (
            <Typography color="text.secondary">
              Loading permission catalog…
            </Typography>
          )}
          {actionError ? (
            <Alert severity="error">
              {getErrorMessage(actionError, 'Permission assignment failed')}
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      <ConfirmDialog
        open={confirmOpen}
        title="Replace all role permissions?"
        description={`The role will have ${selected.length} permission${selected.length === 1 ? '' : 's'}. Removed permissions can immediately revoke user access.`}
        confirmLabel="Replace permissions"
        destructive
        loading={mutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
      />
    </>
  );
}
