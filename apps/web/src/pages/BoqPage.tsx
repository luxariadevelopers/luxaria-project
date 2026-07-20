import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { getErrorMessage, isForbiddenError, toAppError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  BoqFilters,
  BoqHierarchyTree,
  BoqItemPanel,
  BoqSummaryTotals,
  BOQ_ROUTES,
  emptyBoqFilters,
  filterBoqHierarchy,
  findBoqItem,
  resolveBoqCapabilities,
  summariseBoqHierarchy,
  useActiveBoqVersion,
  useBoqHierarchy,
  useBoqTotals,
  boqVersionStatusLabel,
  boqVersionTypeLabel,
  type BoqTreeSelection,
} from '@/boq';

/**
 * BOQ hierarchy browser — `/project-control/boq` (Micro Phase 077).
 *
 * Nest: active version, hierarchy tree, validate-totals.
 * Permission: `boq.view`. Requires project + active version.
 */
export function BoqPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveBoqCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();

  const [filters, setFilters] = useState(emptyBoqFilters);
  const [selected, setSelected] = useState<BoqTreeSelection>(null);

  const canView = Boolean(access) && caps.canView;
  const enabled = canView && Boolean(selectedProjectId);

  const activeVersion = useActiveBoqVersion(selectedProjectId, enabled);
  const hasActiveVersion = Boolean(activeVersion.data);
  const hierarchyEnabled =
    enabled && hasActiveVersion && !activeVersion.isError;

  const hierarchy = useBoqHierarchy(selectedProjectId, hierarchyEnabled);
  const totals = useBoqTotals(selectedProjectId, hierarchyEnabled);

  const filteredTree = useMemo(
    () => filterBoqHierarchy(hierarchy.data ?? [], filters),
    [hierarchy.data, filters],
  );

  const filteredTotals = useMemo(
    () => summariseBoqHierarchy(filteredTree),
    [filteredTree],
  );

  const selectedItem = useMemo(() => {
    if (selected?.kind !== 'item' || !hierarchy.data) return null;
    return findBoqItem(hierarchy.data, selected.id);
  }, [hierarchy.data, selected]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="BOQ unavailable"
        message="You need the boq.view permission to browse the project BOQ."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to browse its BOQ hierarchy."
      />
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

  if (activeVersion.isLoading) {
    return (
      <Stack spacing={2} alignItems="flex-start" data-testid="boq-page-loading">
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading active BOQ version…</Typography>
      </Stack>
    );
  }

  if (
    (activeVersion.error &&
      toAppError(activeVersion.error).kind === 'not_found') ||
    (!activeVersion.isLoading &&
      !activeVersion.error &&
      activeVersion.data == null)
  ) {
    return (
      <EmptyState
        title="No active BOQ version"
        description="This project has no active BOQ version. Activate a version before browsing the hierarchy."
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

  if (hierarchy.error && isForbiddenError(hierarchy.error)) {
    return (
      <PermissionDenied
        error={hierarchy.error}
        title="BOQ hierarchy denied"
        message="You do not have permission to load the BOQ tree."
      />
    );
  }

  const projectLabel =
    selectedProject?.projectCode && selectedProject.projectName
      ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
      : selectedProject?.projectName ?? selectedProjectId;

  const version = activeVersion.data;

  return (
    <Stack spacing={2} data-testid="boq-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box>
          <Typography color="text.secondary">
            Project BOQ for <strong>{projectLabel}</strong> — navigate block →
            floor → work category → item.
          </Typography>
          {version ? (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Chip
                size="small"
                label={`v${version.versionNumber} · ${boqVersionTypeLabel(version.versionType)}`}
              />
              <Chip
                size="small"
                color="success"
                label={boqVersionStatusLabel(version.status)}
              />
            </Stack>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button component={RouterLink} to={BOQ_ROUTES.versions}>
            Versions
          </Button>
          {caps.canManage ? (
            <Button
              component={RouterLink}
              to={BOQ_ROUTES.itemCreate}
              variant="outlined"
            >
              New item
            </Button>
          ) : null}
          {caps.canImport ? (
            <Button
              component={RouterLink}
              to={BOQ_ROUTES.import}
              variant="contained"
            >
              Import Excel
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {hierarchy.error ? (
        <RetryPanel
          error={hierarchy.error}
          onRetry={() => void hierarchy.refetch()}
          forceRetry
        />
      ) : (
        <>
          <BoqSummaryTotals
            totals={
              filters.search ||
              filters.blockId ||
              filters.floorId ||
              filters.workCategoryId ||
              filters.status
                ? filteredTotals
                : (totals.data?.totals ?? filteredTotals)
            }
            valid={
              filters.search ||
              filters.blockId ||
              filters.floorId ||
              filters.workCategoryId ||
              filters.status
                ? null
                : (totals.data?.valid ?? null)
            }
            invalidCount={totals.data?.invalidCount}
            loading={totals.isLoading || hierarchy.isLoading}
          />

          {totals.error && !isForbiddenError(totals.error) ? (
            <Alert severity="warning">
              Could not validate totals: {getErrorMessage(totals.error)}
            </Alert>
          ) : null}

          <BoqFilters
            value={filters}
            tree={hierarchy.data ?? []}
            onChange={(next) => {
              setFilters(next);
              setSelected(null);
            }}
          />

          {hierarchy.isLoading ? (
            <CircularProgress size={28} />
          ) : (
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: 'stretch' }}
            >
              <Box sx={{ flex: 1.4, minWidth: 0 }}>
                <BoqHierarchyTree
                  blocks={filteredTree}
                  selected={selected}
                  onSelect={setSelected}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <BoqItemPanel item={selectedItem} />
              </Box>
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
