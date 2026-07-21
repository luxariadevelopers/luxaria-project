import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { RoleStatus } from '@/rbac-admin/types';
import { useRolesList } from '@/rbac-admin/useRbac';
import { useUsersList } from '@/user-admin/useUsers';
import { APPROVAL_WORKFLOW_PRESETS } from './presets';
import { resolveApprovalWorkflowCapabilities } from './roleAccess';
import {
  useApprovalWorkflow,
  useUpsertApprovalWorkflow,
} from './useApprovalWorkflows';
import { WorkflowStepEditor } from './WorkflowStepEditor';
import {
  defaultWorkflowFormState,
  defaultWorkflowStep,
  formStateFromWorkflow,
  renumberSteps,
  validateWorkflowForm,
} from './validation';

/**
 * Administration approval workflow editor — `/administration/approval-workflows`.
 * Nest: `GET/PUT /approval-workflows`. Permission: `approval.configure`.
 */
export function ApprovalWorkflowConfigPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveApprovalWorkflowCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();

  const [presetKey, setPresetKey] = useState<string>('');
  const [module, setModule] = useState('procurement');
  const [entityType, setEntityType] = useState('purchase_order');
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [form, setForm] = useState(defaultWorkflowFormState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const canConfigure = Boolean(access) && caps.canConfigure;
  const canPickRoles = hasPermission('role.view');
  const canPickUsers = hasPermission('user.view');

  const workflowQuery = useApprovalWorkflow(
    loadedKey ? module : '',
    loadedKey ? entityType : '',
    canConfigure && Boolean(loadedKey),
  );
  const saveMutation = useUpsertApprovalWorkflow();

  const rolesQuery = useRolesList(
    {
      page: 1,
      limit: 200,
      status: RoleStatus.Active,
      sortBy: 'name',
      sortOrder: 'asc',
    },
    canConfigure && canPickRoles,
  );

  const usersQuery = useUsersList(
    {
      page: 1,
      limit: 200,
      sortBy: 'fullName',
      sortOrder: 'asc',
    },
    canConfigure && canPickUsers,
  );

  const selectionKey = `${module.trim().toLowerCase()}::${entityType.trim().toLowerCase()}`;

  useEffect(() => {
    if (!loadedKey || loadedKey !== selectionKey) {
      return;
    }
    if (workflowQuery.isLoading || workflowQuery.isFetching) {
      return;
    }
    if (workflowQuery.error) {
      return;
    }
    setForm(
      formStateFromWorkflow(
        workflowQuery.data
          ? {
              name: workflowQuery.data.name ?? '',
              allowSelfApprove: workflowQuery.data.allowSelfApprove,
              steps: workflowQuery.data.steps,
            }
          : null,
      ),
    );
    setFieldErrors({});
  }, [
    loadedKey,
    selectionKey,
    workflowQuery.data,
    workflowQuery.error,
    workflowQuery.isLoading,
    workflowQuery.isFetching,
  ]);

  const presetOptions = useMemo(
    () =>
      APPROVAL_WORKFLOW_PRESETS.map((preset) => ({
        key: `${preset.module}::${preset.entityType}`,
        ...preset,
      })),
    [],
  );

  const applyPreset = (key: string) => {
    setPresetKey(key);
    const preset = presetOptions.find((option) => option.key === key);
    if (!preset) {
      return;
    }
    setModule(preset.module);
    setEntityType(preset.entityType);
    setLoadedKey(null);
    setForm(defaultWorkflowFormState());
    setFieldErrors({});
  };

  const loadWorkflow = () => {
    const trimmedModule = module.trim();
    const trimmedEntityType = entityType.trim();
    if (!trimmedModule || !trimmedEntityType) {
      setFieldErrors({
        ...(trimmedModule ? {} : { module: 'Module is required' }),
        ...(trimmedEntityType ? {} : { entityType: 'Entity type is required' }),
      });
      return;
    }
    setFieldErrors({});
    setLoadedKey(`${trimmedModule.toLowerCase()}::${trimmedEntityType.toLowerCase()}`);
  };

  const updateStep = (index: number, nextStep: (typeof form.steps)[number]) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step, stepIndex) =>
        stepIndex === index ? nextStep : step,
      ),
    }));
  };

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      steps: renumberSteps([
        ...prev.steps,
        defaultWorkflowStep(prev.steps.length + 1),
      ]),
    }));
  };

  const removeStep = (index: number) => {
    setForm((prev) => ({
      ...prev,
      steps: renumberSteps(prev.steps.filter((_, stepIndex) => stepIndex !== index)),
    }));
  };

  const saveWorkflow = async () => {
    const validated = validateWorkflowForm({ module, entityType, form });
    if (!validated.ok) {
      setFieldErrors(validated.fieldErrors);
      notifyError(validated.message);
      return;
    }

    setFieldErrors({});
    try {
      const result = await saveMutation.mutateAsync(validated.input);
      success(result.message || 'Approval workflow saved');
      setLoadedKey(
        `${result.workflow.module}::${result.workflow.entityType}`,
      );
      setModule(result.workflow.module);
      setEntityType(result.workflow.entityType);
      setForm(formStateFromWorkflow(result.workflow));
    } catch (error) {
      notifyError(getErrorMessage(error, 'Save approval workflow failed'));
    }
  };

  if (access && !caps.canConfigure) {
    return (
      <PermissionDenied
        title="Approval workflows unavailable"
        message="You need the approval.configure permission to manage approval workflow definitions."
      />
    );
  }

  const queryDenied =
    workflowQuery.error != null && isForbiddenError(workflowQuery.error);

  if (queryDenied) {
    return (
      <PermissionDenied
        error={workflowQuery.error}
        title="Approval workflows denied"
        message="You do not have permission to load workflow configuration."
      />
    );
  }

  const isLoaded = loadedKey === selectionKey;
  const showLoading = isLoaded && workflowQuery.isLoading;
  const showLoadError = isLoaded && workflowQuery.error && !queryDenied;

  return (
    <Stack spacing={2} data-testid="approval-workflows-page">
      <Typography color="text.secondary">
        Configure maker-checker steps for a module and entity type. Amount
        ranges determine which steps apply to each approval request.
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: { md: 'center' } }}
      >
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel id="approval-workflow-preset-label">Preset</InputLabel>
          <Select
            labelId="approval-workflow-preset-label"
            label="Preset"
            value={presetKey}
            onChange={(event) => applyPreset(String(event.target.value))}
          >
            <MenuItem value="">Custom / manual</MenuItem>
            {presetOptions.map((preset) => (
              <MenuItem key={preset.key} value={preset.key}>
                {preset.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Module"
          value={module}
          error={Boolean(fieldErrors.module)}
          helperText={fieldErrors.module}
          onChange={(event) => {
            setModule(event.target.value);
            setLoadedKey(null);
            setPresetKey('');
          }}
          sx={{ minWidth: 180 }}
        />

        <TextField
          size="small"
          label="Entity type"
          value={entityType}
          error={Boolean(fieldErrors.entityType)}
          helperText={fieldErrors.entityType}
          onChange={(event) => {
            setEntityType(event.target.value);
            setLoadedKey(null);
            setPresetKey('');
          }}
          sx={{ minWidth: 180 }}
        />

        <Button variant="outlined" onClick={loadWorkflow}>
          Load workflow
        </Button>
      </Stack>

      {!loadedKey ? (
        <EmptyState
          title="Select module and entity type"
          description="Choose a preset or enter module and entity type, then load the active workflow (or start a new definition)."
        />
      ) : showLoading ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Stack>
      ) : showLoadError ? (
        <RetryPanel
          error={workflowQuery.error}
          onRetry={() => void workflowQuery.refetch()}
          forceRetry
        />
      ) : (
        <>
          {!workflowQuery.data ? (
            <Alert severity="info" variant="outlined">
              No active workflow exists for {module}/{entityType}. Saving will
              create one.
            </Alert>
          ) : (
            <Alert severity="success" variant="outlined">
              Loaded active workflow for {workflowQuery.data.module}/
              {workflowQuery.data.entityType}.
            </Alert>
          )}

          <TextField
            size="small"
            label="Workflow name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            fullWidth
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.allowSelfApprove}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    allowSelfApprove: event.target.checked,
                  }))
                }
              />
            }
            label="Allow requester to approve their own request"
          />

          <Stack spacing={1.5}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography variant="h6">Steps</Typography>
              <Button size="small" variant="outlined" onClick={addStep}>
                Add step
              </Button>
            </Stack>

            {fieldErrors.steps ? (
              <Alert severity="warning">{fieldErrors.steps}</Alert>
            ) : null}

            {form.steps.map((step, index) => (
              <WorkflowStepEditor
                key={`step-${index}`}
                step={step}
                index={index}
                roles={rolesQuery.data?.items ?? []}
                users={usersQuery.data?.items ?? []}
                canPickRoles={canPickRoles}
                canPickUsers={canPickUsers}
                fieldErrors={fieldErrors}
                onChange={(next) => updateStep(index, next)}
                onRemove={() => removeStep(index)}
                disableRemove={form.steps.length <= 1}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={saveMutation.isPending}
              onClick={() => void saveWorkflow()}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save workflow'}
            </Button>
            <Button
              variant="text"
              disabled={workflowQuery.isFetching}
              onClick={() => void workflowQuery.refetch()}
            >
              Reload
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
