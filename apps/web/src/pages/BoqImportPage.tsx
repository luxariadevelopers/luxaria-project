import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { isForbiddenError, toAppError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  BOQ_ROUTES,
  ImportWizard,
  resolveBoqCapabilities,
  useActiveBoqVersion,
} from '@/boq';

/**
 * BOQ Excel import wizard — `/project-control/boq/import` (Micro Phase 078).
 *
 * Nest: template download (`boq.view`), commit import (`boq.manage`).
 * Opened from BOQ list. No commit until blocking client errors are resolved.
 */
export function BoqImportPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveBoqCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();

  const canImport = Boolean(access) && caps.canImport;
  const activeVersion = useActiveBoqVersion(
    selectedProjectId,
    canImport && Boolean(selectedProjectId),
  );

  if (access && !caps.canImport) {
    return (
      <PermissionDenied
        title="BOQ import unavailable"
        message="You need the boq.manage permission to import BOQ from Excel (Nest has no boq.import code)."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header before importing a BOQ."
      />
    );
  }

  if (activeVersion.isLoading) {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <CircularProgress size={28} />
        <Typography color="text.secondary">
          Checking active BOQ version…
        </Typography>
      </Stack>
    );
  }

  if (activeVersion.error && isForbiddenError(activeVersion.error)) {
    return (
      <PermissionDenied
        error={activeVersion.error}
        title="BOQ denied"
        message="You do not have permission to load BOQ for this project."
      />
    );
  }

  if (
    activeVersion.error &&
    toAppError(activeVersion.error).kind === 'not_found'
  ) {
    return (
      <EmptyState
        title="No active BOQ version"
        description="Activate a BOQ version for this project before importing items into it."
        actionLabel="Back to BOQ"
        onAction={() => navigate(BOQ_ROUTES.list)}
      />
    );
  }

  if (activeVersion.error) {
    return (
      <RetryPanel
        error={activeVersion.error}
        onRetry={() => void activeVersion.refetch()}
        forceRetry
      />
    );
  }

  const projectLabel =
    selectedProject?.projectCode && selectedProject.projectName
      ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
      : selectedProject?.projectName ?? selectedProjectId;

  return (
    <Stack spacing={2} data-testid="boq-import-page">
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography color="text.secondary">
          Import BOQ Excel for <strong>{projectLabel}</strong>. Validate
          columns and codes before commit.
        </Typography>
        <Button component={RouterLink} to={BOQ_ROUTES.list} variant="text">
          Back to BOQ
        </Button>
      </Stack>
      <ImportWizard projectId={selectedProjectId} />
    </Stack>
  );
}
