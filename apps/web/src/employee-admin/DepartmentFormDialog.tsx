import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicDepartment } from './types';
import { useCreateDepartment, useUpdateDepartment } from './useEmployees';

type Props = {
  open: boolean;
  department?: PublicDepartment | null;
  onClose: () => void;
};

export function DepartmentFormDialog({ open, department, onClose }: Props) {
  const notify = useNotify();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const editing = Boolean(department);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCode(department?.code ?? '');
    setName(department?.name ?? '');
    setDescription(department?.description ?? '');
    setError(null);
  }, [open, department]);

  const busy = createMutation.isPending || updateMutation.isPending;

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName) {
      setError('Department name is required');
      return;
    }
    if (!editing && trimmedCode.length < 2) {
      setError('Code must be at least 2 characters');
      return;
    }
    setError(null);
    try {
      if (editing && department) {
        await updateMutation.mutateAsync({
          departmentId: department.id,
          input: {
            name: trimmedName,
            description: description.trim() || null,
          },
        });
        notify.success('Department updated');
      } else {
        await createMutation.mutateAsync({
          code: trimmedCode,
          name: trimmedName,
          description: description.trim() || null,
        });
        notify.success('Department created');
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save department'));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="department-form-dialog"
    >
      <DialogTitle>
        {editing ? 'Edit department' : 'Create department'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required={!editing}
            disabled={editing || busy}
            helperText={
              editing
                ? 'Code cannot be changed after create'
                : 'Unique short code, e.g. ENGINEERING'
            }
            fullWidth
            autoFocus={!editing}
          />
          <TextField
            label="Department name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={busy}
            fullWidth
            autoFocus={editing}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            fullWidth
            multiline
            minRows={2}
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={busy}>
          {busy ? (
            <CircularProgress size={20} color="inherit" />
          ) : editing ? (
            'Save'
          ) : (
            'Create'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
