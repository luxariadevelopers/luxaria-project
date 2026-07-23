import { useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DetailHeader } from '@/components/entity-detail';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  ROOT_STRUCTURE_TYPE_OPTIONS,
  STRUCTURE_NODE_TYPE_OPTIONS,
  structureNodeFieldLabels,
  structureTypesAllowedUnder,
} from './constants';
import {
  useCreateProjectStructureNode,
  useProjectDetail,
  useProjectStructure,
  useUpdateProjectStructureNode,
} from './useProjects';
import {
  StructureSiteType,
  type PublicProjectSiteNode,
  type UpdateStructureNodeInput,
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
  canManage,
  onAddRoot,
  onEdit,
}: {
  nodes: PublicProjectSiteNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  canManage: boolean;
  onAddRoot: () => void;
  onEdit: (node: PublicProjectSiteNode) => void;
}) {
  const flat = useMemo(() => flattenNodes(nodes), [nodes]);

  if (flat.length === 0) {
    return (
      <EmptyState
        title="No structure yet"
        description="Add a root site to start the hierarchy."
        actionLabel={canManage ? 'Add root site' : undefined}
        onAction={canManage ? onAddRoot : undefined}
      />
    );
  }

  return (
    <List dense disablePadding>
      {flat.map((node) => (
        <ListItem
          key={node.id}
          disablePadding
          secondaryAction={
            canManage ? (
              <Tooltip title="Edit node">
                <IconButton
                  edge="end"
                  size="small"
                  aria-label={`Edit ${node.siteCode}`}
                  data-testid={`edit-structure-node-${node.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(node);
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null
          }
          sx={{ pl: 1.5 + node.depth * 2 }}
        >
          <ListItemButton
            selected={selectedId === node.id}
            onClick={() => onSelect(node.id)}
          >
            <ListItemText
              primary={`${node.siteCode} · ${node.siteName}`}
              secondary={node.type}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

type RootSiteDialogProps = {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: {
    type: string;
    siteCode: string;
    siteName: string;
  }) => Promise<void>;
};

function AddRootSiteDialog({
  open,
  submitting,
  onClose,
  onSubmit,
}: RootSiteDialogProps) {
  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = () => {
    setSiteCode('');
    setSiteName('');
    setLocalError(null);
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const canSubmit = Boolean(siteCode.trim() && siteName.trim()) && !submitting;

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      data-testid="add-root-site-dialog"
    >
      <DialogTitle>Add root site</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            The root must always be a Site. After this, add phase → block →
            tower → floor under it.
          </Typography>
          {localError ? <Alert severity="error">{localError}</Alert> : null}
          <TextField
            label="Type"
            value="Site"
            fullWidth
            disabled
            helperText="Root is always Site — locked"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={structureNodeFieldLabels(StructureSiteType.Site).codeLabel}
              value={siteCode}
              onChange={(event) => setSiteCode(event.target.value)}
              fullWidth
              required
              autoFocus
              disabled={submitting}
              helperText={
                structureNodeFieldLabels(StructureSiteType.Site).codeHelper
              }
              slotProps={{
                htmlInput: { 'data-testid': 'root-site-code' },
              }}
            />
            <TextField
              label={structureNodeFieldLabels(StructureSiteType.Site).nameLabel}
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              fullWidth
              required
              disabled={submitting}
              helperText={
                structureNodeFieldLabels(StructureSiteType.Site).nameHelper
              }
              slotProps={{
                htmlInput: { 'data-testid': 'root-site-name' },
              }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => {
            void (async () => {
              setLocalError(null);
              try {
                await onSubmit({
                  type: StructureSiteType.Site,
                  siteCode: siteCode.trim(),
                  siteName: siteName.trim(),
                });
                reset();
              } catch (error) {
                setLocalError(
                  getErrorMessage(error, 'Could not create root site'),
                );
              }
            })();
          }}
        >
          {submitting ? 'Adding…' : 'Add root site'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type EditStructureDialogProps = {
  open: boolean;
  node: PublicProjectSiteNode | null;
  parentOptions: Array<PublicProjectSiteNode & { depth: number }>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: UpdateStructureNodeInput) => Promise<void>;
};

function EditStructureNodeDialog({
  open,
  node,
  parentOptions,
  submitting,
  onClose,
  onSubmit,
}: EditStructureDialogProps) {
  const [siteName, setSiteName] = useState('');
  const [type, setType] = useState<string>(StructureSiteType.Site);
  const [parentSiteId, setParentSiteId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!node || !open) return;
    setSiteName(node.siteName);
    setParentSiteId(node.parentSiteId ?? '');
    setType(
      !node.parentSiteId ? StructureSiteType.Site : String(node.type),
    );
    setLocalError(null);
  }, [node, open]);

  const otherParents = useMemo(
    () => parentOptions.filter((option) => option.id !== node?.id),
    [parentOptions, node?.id],
  );
  const parentType = otherParents.find((p) => p.id === parentSiteId)?.type;
  const allowedTypes = useMemo(() => {
    if (!parentSiteId) return ROOT_STRUCTURE_TYPE_OPTIONS;
    return structureTypesAllowedUnder(parentType);
  }, [parentSiteId, parentType]);
  const keepAsRoot = !parentSiteId;
  const needsSiteFix =
    Boolean(node) && !node?.parentSiteId && node?.type !== StructureSiteType.Site;

  useEffect(() => {
    if (!allowedTypes.some((option) => option.value === type)) {
      setType(allowedTypes[0]?.value ?? StructureSiteType.Site);
    }
  }, [allowedTypes, type]);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      data-testid="edit-structure-node-dialog"
    >
      <DialogTitle>Edit structure node</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {localError ? <Alert severity="error">{localError}</Alert> : null}
          {needsSiteFix ? (
            <Alert severity="warning">
              This top node is type “{node?.type}” but a root must be Site.
              Click <strong>Save as Site</strong> below. After that, add floors
              with “Add structure node” (parent = this site, type = Floor).
            </Alert>
          ) : null}
          <TextField
            label={
              structureNodeFieldLabels(
                keepAsRoot ? StructureSiteType.Site : type || node?.type,
              ).codeLabel
            }
            value={node?.siteCode ?? ''}
            fullWidth
            disabled
            helperText="Code is fixed after create"
          />
          <TextField
            label={
              structureNodeFieldLabels(
                keepAsRoot ? StructureSiteType.Site : type || node?.type,
              ).nameLabel
            }
            value={siteName}
            onChange={(event) => setSiteName(event.target.value)}
            fullWidth
            required
            disabled={submitting}
            autoFocus
          />
          {otherParents.length > 0 ? (
            <FormControl fullWidth>
              <InputLabel id="edit-structure-parent">Parent</InputLabel>
              <Select
                labelId="edit-structure-parent"
                label="Parent"
                value={parentSiteId}
                onChange={(event) => setParentSiteId(event.target.value)}
                disabled={submitting}
              >
                <MenuItem value="">None — keep as root Site</MenuItem>
                {otherParents.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {'—'.repeat(option.depth)} {option.siteCode} ·{' '}
                    {option.siteName} ({option.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Alert severity="info">
              No other nodes to use as parent yet. This stays the root Site.
              After saving, add Phase / Block / Tower / Floor under it from the
              form below the hierarchy.
            </Alert>
          )}
          {keepAsRoot ? (
            <TextField
              label="Type"
              value="Site"
              fullWidth
              disabled
              helperText="Root is always Site — Type dropdown stays closed on purpose"
            />
          ) : (
            <FormControl fullWidth>
              <InputLabel id="edit-structure-type">Type</InputLabel>
              <Select
                labelId="edit-structure-type"
                label="Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                disabled={submitting || allowedTypes.length === 0}
              >
                {(allowedTypes.length
                  ? allowedTypes
                  : STRUCTURE_NODE_TYPE_OPTIONS
                ).map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={
            !siteName.trim() ||
            submitting ||
            (!keepAsRoot && allowedTypes.length === 0)
          }
          onClick={() => {
            void (async () => {
              setLocalError(null);
              try {
                await onSubmit({
                  siteName: siteName.trim(),
                  parentSiteId: parentSiteId || null,
                  type: keepAsRoot ? StructureSiteType.Site : type,
                });
              } catch (error) {
                setLocalError(
                  getErrorMessage(error, 'Could not update structure node'),
                );
              }
            })();
          }}
        >
          {submitting
            ? 'Saving…'
            : needsSiteFix
              ? 'Save as Site'
              : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
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
  const updateMutation = useUpdateProjectStructureNode(projectId ?? '');

  const [parentSiteId, setParentSiteId] = useState('');
  const [type, setType] = useState<string>(StructureSiteType.Site);
  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [rootDialogOpen, setRootDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<PublicProjectSiteNode | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const project = detailQuery.data;
  const parentOptions = useMemo(
    () => flattenNodes(structureQuery.data ?? []),
    [structureQuery.data],
  );
  const selectedParent = parentOptions.find((node) => node.id === parentSiteId);
  const allowedTypes = useMemo(
    () => structureTypesAllowedUnder(selectedParent?.type),
    [selectedParent?.type],
  );

  useEffect(() => {
    if (!allowedTypes.some((option) => option.value === type)) {
      setType(allowedTypes[0]?.value ?? '');
    }
  }, [allowedTypes, type]);

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

  const noValidChild =
    Boolean(parentSiteId) && allowedTypes.length === 0;
  const createFieldLabels = structureNodeFieldLabels(type);

  return (
    <Stack spacing={2.5} data-testid="project-structure-page">
      <DetailHeader
        title={`${project.projectName} structure`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="h6">Hierarchy</Typography>
          {canManage ? (
            <Tooltip title="Add root site">
              <IconButton
                color="primary"
                aria-label="Add root site"
                data-testid="add-root-site-button"
                onClick={() => setRootDialogOpen(true)}
                size="small"
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Soft hierarchy: site → phase → block → tower → floor.
        </Typography>
        <StructureTree
          nodes={structureQuery.data ?? []}
          selectedId={parentSiteId}
          onSelect={setParentSiteId}
          canManage={canManage}
          onAddRoot={() => setRootDialogOpen(true)}
          onEdit={setEditingNode}
        />
      </Paper>

      {canManage ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Add structure node</Typography>
            <Typography variant="body2" color="text.secondary">
              Root (no parent) is always Site. Under a Site you can add Phase /
              Block / Tower / Floor in order. Nothing can be added under a Floor.
            </Typography>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            {noValidChild ? (
              <Alert severity="warning">
                “{selectedParent?.siteCode}” is type {selectedParent?.type}.
                Nothing can nest under it. Choose a higher parent (Site / Phase /
                Block / Tower), or add a proper root Site with +.
              </Alert>
            ) : null}
            <FormControl fullWidth>
              <InputLabel id="structure-parent">Parent (optional)</InputLabel>
              <Select
                labelId="structure-parent"
                label="Parent (optional)"
                value={parentSiteId}
                onChange={(event) => {
                  setParentSiteId(event.target.value);
                  setFormError(null);
                }}
              >
                <MenuItem value="">Root (no parent)</MenuItem>
                {parentOptions.map((node) => (
                  <MenuItem key={node.id} value={node.id}>
                    {'—'.repeat(node.depth)} {node.siteCode} · {node.siteName}{' '}
                    ({node.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={noValidChild || allowedTypes.length === 0}>
              <InputLabel id="structure-type">Type</InputLabel>
              <Select
                labelId="structure-type"
                label="Type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {allowedTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={createFieldLabels.codeLabel}
                value={siteCode}
                onChange={(event) => setSiteCode(event.target.value)}
                fullWidth
                required
                helperText={createFieldLabels.codeHelper}
              />
              <TextField
                label={createFieldLabels.nameLabel}
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                fullWidth
                required
                helperText={createFieldLabels.nameHelper}
              />
            </Stack>
            <Button
              variant="contained"
              disabled={
                noValidChild ||
                !type ||
                !siteCode.trim() ||
                !siteName.trim() ||
                createMutation.isPending
              }
              onClick={async () => {
                setFormError(null);
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
                  const message = getErrorMessage(
                    error,
                    'Structure node could not be created',
                  );
                  setFormError(message);
                  notify.error(message);
                }
              }}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add node
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {canManage ? (
        <AddRootSiteDialog
          open={rootDialogOpen}
          submitting={createMutation.isPending}
          onClose={() => setRootDialogOpen(false)}
          onSubmit={async (input) => {
            await createMutation.mutateAsync({
              parentSiteId: null,
              type: input.type,
              siteCode: input.siteCode,
              siteName: input.siteName,
            });
            setRootDialogOpen(false);
            notify.success('Root site created');
          }}
        />
      ) : null}

      {canManage ? (
        <EditStructureNodeDialog
          open={Boolean(editingNode)}
          node={editingNode}
          parentOptions={parentOptions}
          submitting={updateMutation.isPending}
          onClose={() => setEditingNode(null)}
          onSubmit={async (input) => {
            if (!editingNode) return;
            await updateMutation.mutateAsync({
              siteId: editingNode.id,
              input,
            });
            setEditingNode(null);
            notify.success('Structure node updated');
          }}
        />
      ) : null}
    </Stack>
  );
}
