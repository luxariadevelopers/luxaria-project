import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  SITE_ENGINEER_ACCESS_MODULES,
  buildPermissionDeniesFromModules,
  defaultEnabledModules,
  enabledModulesFromDenyPermissions,
  moduleAccessCatalogPermissions,
} from './siteEngineerAccessModules';
import type { EmployeeAccessSummary } from './types';
import { useSyncEmployeeModuleAccess } from './useEmployees';

type Props = {
  employeeId: string;
  summary: EmployeeAccessSummary;
  canEdit: boolean;
};

export function EmployeeModuleAccessPanel({
  employeeId,
  summary,
  canEdit,
}: Props) {
  const notify = useNotify();
  const syncMutation = useSyncEmployeeModuleAccess(employeeId);

  const denyFromSummary = useMemo(
    () =>
      summary.overrides
        .filter((row) => row.effect === 'deny' && !row.projectId && !row.siteId)
        .map((row) => row.permission),
    [summary.overrides],
  );

  const [enabledModules, setEnabledModules] = useState(() =>
    enabledModulesFromDenyPermissions(denyFromSummary),
  );

  useEffect(() => {
    setEnabledModules(enabledModulesFromDenyPermissions(denyFromSummary));
  }, [denyFromSummary]);

  if (!summary.employee.userId) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Alert severity="warning">
          This employee has no login user yet. Create a login before setting
          web/mobile module access.
        </Alert>
      </Paper>
    );
  }

  const dirty =
    JSON.stringify(enabledModules) !==
    JSON.stringify(enabledModulesFromDenyPermissions(denyFromSummary));

  const save = async () => {
    try {
      await syncMutation.mutateAsync({
        denyPermissions: buildPermissionDeniesFromModules(enabledModules),
        catalogPermissions: moduleAccessCatalogPermissions(),
      });
      notify.success('Module access saved');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Could not save module access'));
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid="employee-module-access-panel"
    >
      <Stack spacing={1.5}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle1">
            What they can see (web & mobile)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This is module access only — not view / edit / approve permissions.
            Tick a module to show it; untick to hide it on dashboard and mobile.
          </Typography>
        </Stack>

        {!canEdit ? (
          <Alert severity="info">
            You need employee.update to change module access.
          </Alert>
        ) : null}

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            disabled={!canEdit || syncMutation.isPending}
            onClick={() => setEnabledModules(defaultEnabledModules())}
          >
            Enable all
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!canEdit || syncMutation.isPending}
            onClick={() =>
              setEnabledModules(
                Object.fromEntries(
                  SITE_ENGINEER_ACCESS_MODULES.map((module) => [
                    module.id,
                    false,
                  ]),
                ),
              )
            }
          >
            Disable all
          </Button>
        </Stack>

        <FormGroup>
          {SITE_ENGINEER_ACCESS_MODULES.map((module) => {
            const surfaces = [
              module.web ? 'Web' : null,
              module.mobile ? 'Mobile' : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <FormControlLabel
                key={module.id}
                disabled={!canEdit || syncMutation.isPending}
                control={
                  <Checkbox
                    checked={enabledModules[module.id] !== false}
                    onChange={(e) =>
                      setEnabledModules((prev) => ({
                        ...prev,
                        [module.id]: e.target.checked,
                      }))
                    }
                  />
                }
                label={
                  <Stack spacing={0.15} sx={{ py: 0.25 }}>
                    <Typography variant="body2">
                      {module.label}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {surfaces}
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {module.description}
                    </Typography>
                  </Stack>
                }
                sx={{ alignItems: 'flex-start', mb: 0.5 }}
              />
            );
          })}
        </FormGroup>

        {canEdit ? (
          <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
            <Button
              variant="contained"
              disabled={!dirty || syncMutation.isPending}
              onClick={() => void save()}
              startIcon={
                syncMutation.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              Save module access
            </Button>
            <Button
              disabled={!dirty || syncMutation.isPending}
              onClick={() =>
                setEnabledModules(
                  enabledModulesFromDenyPermissions(denyFromSummary),
                )
              }
            >
              Reset
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
