import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DetailHeader } from '@/components/entity-detail';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { STRUCTURE_NODE_TYPE_OPTIONS } from './constants';
import {
  useCreateProjectStructureNode,
  useProjectDetail,
  useProjectStructure,
} from './useProjects';
import {
  StructureSiteType,
  type PublicProjectSiteNode,
} from './types';

type Props = {
  projectId?: string;
};

function flattenNodes(
  nodes: PublicProjectSiteNode[],
  depth = 0,
): Array<PublicProjectSiteNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenNodes(node.children ?? [], depth + 1),
  ]);
}

function StructureTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: PublicProjectSiteNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const flat = useMemo(() => flattenNodes(nodes), [nodes]);

  if (flat.length === 0) {
    return (
      <EmptyState
        title="No structure yet"
        description="Add a root site or phase to start the hierarchy."
      />
    );
  }

  return (
    <List dense disablePadding>
      {flat.map((node) => (
        <ListItemButton
          key={node.id}
          selected={selectedId === node.id}
          onClick={() => onSelect(node.id)}
          sx={{ pl: 1.5 + node.depth * 2 }}
        >
          <ListItemText
            primary={`${node.siteCode} · ${node.siteName}`}
            secondary={node.type}
          />
        </ListItemButton>
      ))}
    </List>
  );
}

export function ProjectStructurePage({
  projectId: projectIdProp,
}: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canView = Boolean(access) && hasPermission('site.view');
  const canManage = hasPermission('site.manage');
  const detailQuery = useProjectDetail(projectId, canView);
  const structureQuery = useProjectStructure(projectId, canView);
  const createMutation = useCreateProjectStructureNode(projectId ?? '');

  const [parentSiteId, setParentSiteId] = useState('');
  const [type, setType] = useState<string>(StructureSiteType.Phase);
  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');

  const project = detailQuery.data;
  const parentOptions = useMemo(
    () => flattenNodes(structureQuery.data ?? []),
    [structureQuery.data],
  );

  if (!access || (canView && (detailQuery.isLoading || structureQuery.isLoading))) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canView ||
    (detailQuery.error && isForbiddenError(detailQuery.error)) ||
    (structureQuery.error && isForbiddenError(structureQuery.error))
  ) {
    return (
      <PermissionDenied
        error={detailQuery.error ?? structureQuery.error}
        title="Project structure unavailable"
        message="You need site.view and explicit project access."
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

  if (structureQuery.error) {
    return (
      <RetryPanel
        error={structureQuery.error}
        onRetry={() => void structureQuery.refetch()}
        forceRetry
      />
    );
  }

  return (
    <Stack spacing={2.5} data-testid="project-structure-page">
      <DetailHeader
        title={`${project.projectName} structure`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Hierarchy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Soft hierarchy: site → phase → block → tower → floor.
        </Typography>
        <StructureTree
          nodes={structureQuery.data ?? []}
          selectedId={parentSiteId}
          onSelect={setParentSiteId}
        />
      </Paper>

      {canManage ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Add structure node</Typography>
            <FormControl fullWidth>
              <InputLabel id="structure-parent">Parent (optional)</InputLabel>
              <Select
                labelId="structure-parent"
                label="Parent (optional)"
                value={parentSiteId}
                onChange={(event) => setParentSiteId(event.target.value)}
              >
                <MenuItem value="">Root (no parent)</MenuItem>
                {parentOptions.map((node) => (
                  <MenuItem key={node.id} value={node.id}>
                    {'—'.repeat(node.depth)} {node.siteCode} · {node.siteName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="structure-type">Type</InputLabel>
              <Select
                labelId="structure-type"
                label="Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {STRUCTURE_NODE_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Site code"
                value={siteCode}
                onChange={(event) => setSiteCode(event.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Site name"
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                fullWidth
                required
              />
            </Stack>
            <Button
              variant="contained"
              disabled={
                !siteCode.trim() ||
                !siteName.trim() ||
                createMutation.isPending
              }
              onClick={async () => {
                try {
                  await createMutation.mutateAsync({
                    parentSiteId: parentSiteId || null,
                    type,
                    siteCode: siteCode.trim(),
                    siteName: siteName.trim(),
                  });
                  setSiteCode('');
                  setSiteName('');
                  notify.success('Structure node created');
                } catch (error) {
                  notify.error(getErrorMessage(error));
                }
              }}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add node
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
