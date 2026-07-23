import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicSite } from './types';
import { useCreateSiteAssignment } from './useEmployees';

const ROLE_OPTIONS = [
  'SITE_ENGINEER',
  'SITE_SUPERVISOR',
  'STOREKEEPER',
  'PROJECT_MANAGER',
  'SITE_MANAGER',
  'director',
] as const;

type UserOption = { id: string; fullName: string };
type ProjectOption = { id: string; projectName: string };

type Props = {
  open: boolean;
  users: readonly UserOption[];
  projects: readonly ProjectOption[];
  sites: readonly PublicSite[];
  onClose: () => void;
};

export function AssignSiteAccessDialog({
  open,
  users,
  projects,
  sites,
  onClose,
}: Props) {
  const notify = useNotify();
  const createMutation = useCreateSiteAssignment();

  const [userId, setUserId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [roleInSite, setRoleInSite] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUserId('');
    setProjectId('');
    setSiteId('');
    setRoleInSite('');
    setError(null);
  }, [open]);

  const sitesForProject = useMemo(
    () => sites.filter((site) => site.projectId === projectId),
    [projectId, sites],
  );

  const busy = createMutation.isPending;

  const submit = async () => {
    if (!userId) {
      setError('Select a person');
      return;
    }
    if (!projectId) {
      setError('Select a project');
      return;
    }
    if (!siteId) {
      setError('Select a site');
      return;
    }
    setError(null);
    try {
      await createMutation.mutateAsync({
        userId,
        projectId,
        siteId,
        roleInSite: roleInSite.trim() || null,
      });
      notify.success('Person added to site access');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not assign site access'));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="assign-site-access-dialog"
    >
      <DialogTitle>Add person to site</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <FormControl fullWidth required disabled={busy}>
            <InputLabel id="assign-user">Person</InputLabel>
            <Select
              labelId="assign-user"
              label="Person"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required disabled={busy}>
            <InputLabel id="assign-project">Project</InputLabel>
            <Select
              labelId="assign-project"
              label="Project"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSiteId('');
              }}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.projectName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required disabled={busy || !projectId}>
            <InputLabel id="assign-site">Site</InputLabel>
            <Select
              labelId="assign-site"
              label="Site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            >
              {sitesForProject.length === 0 ? (
                <MenuItem value="" disabled>
                  No sites for this project
                </MenuItem>
              ) : (
                sitesForProject.map((site) => (
                  <MenuItem key={site.id} value={site.id}>
                    {site.siteName} ({site.siteCode})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <TextField
            select
            label="Role in site (optional)"
            value={roleInSite}
            onChange={(e) => setRoleInSite(e.target.value)}
            disabled={busy}
            fullWidth
            helperText="Pick a common role, or leave blank"
          >
            <MenuItem value="">None</MenuItem>
            {ROLE_OPTIONS.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </TextField>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={busy}
          data-testid="assign-site-access-submit"
        >
          {busy ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            'Add to site'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
