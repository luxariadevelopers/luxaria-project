import { useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { ProjectForm } from './ProjectForm';
import {
  useProjectBankOptions,
  useProjectCompany,
  useProjectDetail,
  useUpdateProject,
} from './useProjects';
import {
  toUpdateProjectInput,
  type ProjectFormValues,
} from './validation';

type Props = {
  projectId?: string;
};

export function ProjectEditPage({ projectId: projectIdProp }: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { access, hasPermission } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [serverError, setServerError] = useState<unknown>();

  const canEdit =
    Boolean(access) &&
    hasPermission('project.view') &&
    hasPermission('project.update');
  const detailQuery = useProjectDetail(projectId, canEdit);
  const project = detailQuery.data;
  const companyQuery = useProjectCompany(
    project?.companyId,
    canEdit && Boolean(project) && hasPermission('company.view'),
  );
  const banksQuery = useProjectBankOptions(
    canEdit && hasPermission('bank.view'),
  );
  const updateMutation = useUpdateProject(projectId ?? '');

  if (!access || (canEdit && detailQuery.isLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canEdit ||
    (detailQuery.error && isForbiddenError(detailQuery.error))
  ) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Project edit unavailable"
        message="You need project.view, project.update, and explicit project access."
      />
    );
  }

  if (detailQuery.error || !project) {
    return (
      <RetryPanel
        error={detailQuery.error ?? new Error('Project not found')}
        onRetry={() => void detailQuery.refetch()}
        forceRetry
      />
    );
  }

  const company = companyQuery.data ?? {
    id: project.companyId ?? '',
    companyCode: project.companyId ?? '—',
    legalName: 'Authenticated company',
    tradeName: 'Authenticated company',
    isPrimary: false,
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    setServerError(undefined);
    try {
      await updateMutation.mutateAsync(toUpdateProjectInput(values));
      notify.success('Project updated successfully');
      void navigate(`/projects/${project.id}`);
    } catch (error) {
      setServerError(error);
      notify.error('Project could not be updated');
    }
  };

  return (
    <Stack spacing={2.5} data-testid="project-edit-page">
      <Stack spacing={0.5}>
        <Typography variant="h5">Edit {project.projectName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {project.projectCode} · status, manager, and director changes are
          handled in Settings.
        </Typography>
      </Stack>
      <ProjectForm
        mode="edit"
        initial={project}
        company={company}
        bankOptions={banksQuery.isSuccess ? banksQuery.data : undefined}
        submitting={updateMutation.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        onCancel={() => void navigate(`/projects/${project.id}`)}
      />
    </Stack>
  );
}
