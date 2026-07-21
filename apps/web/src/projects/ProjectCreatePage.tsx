import { useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { ProjectForm } from './ProjectForm';
import { projectKeys } from './queryKeys';
import {
  useCreateProject,
  useProjectBankOptions,
  useProjectCompany,
  useProjectUserOptions,
} from './useProjects';
import {
  toCreateProjectInput,
  type ProjectFormValues,
} from './validation';

export function ProjectCreatePage() {
  const { user, access, hasPermission } = useAuth();
  const {
    refetch: refetchProjectContext,
    setSelectedProjectId,
    clearProjectCaches,
  } = useProject();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notify = useNotify();
  const [serverError, setServerError] = useState<unknown>();

  const canCreate = Boolean(access) && hasPermission('project.create');
  const canViewCompany = hasPermission('company.view');
  const companyQuery = useProjectCompany(
    user?.companyId,
    canCreate && (user?.companyId == null || canViewCompany),
  );
  const resolvedCompanyId = user?.companyId ?? companyQuery.data?.id ?? null;
  const usersQuery = useProjectUserOptions(
    canCreate && hasPermission('user.view'),
  );
  const banksQuery = useProjectBankOptions(
    canCreate && hasPermission('bank.view'),
  );
  const createMutation = useCreateProject();

  if (!access) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!canCreate) {
    return (
      <PermissionDenied
        title="Project creation unavailable"
        message="You need the project.create permission to create a project."
      />
    );
  }

  if (!resolvedCompanyId && companyQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!resolvedCompanyId) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">Create project</Typography>
        {companyQuery.error ? (
          <RetryPanel
            error={companyQuery.error}
            onRetry={() => void companyQuery.refetch()}
            forceRetry
          />
        ) : (
          <Alert severity="error">
            Your authenticated user has no companyId. company.view is required
            to resolve the read-only /companies/primary tenant.
          </Alert>
        )}
      </Stack>
    );
  }

  const company = companyQuery.data ?? {
    id: resolvedCompanyId,
    companyCode: resolvedCompanyId,
    legalName: 'Authenticated company',
    tradeName: 'Authenticated company',
    isPrimary: false,
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    setServerError(undefined);
    try {
      const created = await createMutation.mutateAsync(
        toCreateProjectInput(values, resolvedCompanyId),
      );
      notify.success(
        `Project ${created.projectCode} created successfully`,
      );
      await queryClient.invalidateQueries({
        queryKey: projectKeys.lists(),
      });
      await refetchProjectContext();
      setSelectedProjectId(created.id);
      await clearProjectCaches();
      void navigate(`/projects/${created.id}`, { replace: true });
    } catch (error) {
      setServerError(error);
      notify.error('Project could not be created');
    }
  };

  return (
    <Stack spacing={2.5} data-testid="project-create-page">
      <Stack spacing={0.5}>
        <Typography variant="h5">Create project</Typography>
        <Typography variant="body2" color="text.secondary">
          Enter the project master data. The project code is generated after
          the server accepts the record.
        </Typography>
      </Stack>

      {usersQuery.error ? (
        <Alert severity="info">
          User assignments are temporarily hidden because the optional
          /users lookup is unavailable. They can be set later in Settings.
        </Alert>
      ) : null}
      {banksQuery.error ? (
        <Alert severity="info">
          The optional bank selector is hidden because
          /company-bank-accounts is unavailable.
        </Alert>
      ) : null}

      <ProjectForm
        mode="create"
        company={company}
        userOptions={usersQuery.isSuccess ? usersQuery.data : undefined}
        bankOptions={banksQuery.isSuccess ? banksQuery.data : undefined}
        allowTerminalStatus={hasPermission('project.close')}
        submitting={createMutation.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        onCancel={() => void navigate('/projects')}
      />
    </Stack>
  );
}
