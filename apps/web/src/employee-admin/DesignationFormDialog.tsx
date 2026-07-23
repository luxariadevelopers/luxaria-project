import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { formDrawerPaperSx } from '@/components/forms';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicDepartment, PublicDesignation } from './types';
import { useCreateDesignation, useUpdateDesignation } from './useEmployees';

type Props = {
  open: boolean;
  designation?: PublicDesignation | null;
  departments: readonly PublicDepartment[];
  onClose: () => void;
};

export function DesignationFormDialog({
  open,
  designation,
  departments,
  onClose,
}: Props) {
  const notify = useNotify();
  const createMutation = useCreateDesignation();
  const updateMutation = useUpdateDesignation();
  const editing = Boolean(designation);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [defaultRoleCode, setDefaultRoleCode] = useState('');
  const [mobileEligible, setMobileEligible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCode(designation?.code ?? '');
    setName(designation?.name ?? '');
    setDepartmentId(designation?.departmentId ?? '');
    setDefaultRoleCode(designation?.defaultRoleCode ?? '');
    setMobileEligible(designation?.mobileEligible ?? true);
    setError(null);
  }, [open, designation]);

  const busy = createMutation.isPending || updateMutation.isPending;

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName) {
      setError('Designation name is required');
      return;
    }
    if (!editing && trimmedCode.length < 2) {
      setError('Code must be at least 2 characters');
      return;
    }
    setError(null);
    try {
      if (editing && designation) {
        await updateMutation.mutateAsync({
          designationId: designation.id,
          input: {
            name: trimmedName,
            departmentId: departmentId || null,
            defaultRoleCode: defaultRoleCode.trim().toUpperCase() || null,
            mobileEligible,
          },
        });
        notify.success('Designation updated');
      } else {
        await createMutation.mutateAsync({
          code: trimmedCode,
          name: trimmedName,
          departmentId: departmentId || null,
          defaultRoleCode: defaultRoleCode.trim().toUpperCase() || null,
          mobileEligible,
        });
        notify.success('Designation created');
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save designation'));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={busy ? undefined : onClose}
      slotProps={{ paper: { sx: formDrawerPaperSx(480) } }}
      data-testid="designation-form-dialog"
    >
      <Box
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Typography variant="h6">
            {editing ? 'Edit designation' : 'Create designation'}
          </Typography>
          <TextField
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required={!editing}
            disabled={editing || busy}
            helperText={
              editing
                ? 'Code cannot be changed after create'
                : 'Unique short code, e.g. SITE_ENGINEER'
            }
            fullWidth
            autoFocus={!editing}
          />
          <TextField
            label="Designation name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={busy}
            fullWidth
            autoFocus={editing}
          />
          <FormControl fullWidth disabled={busy}>
            <InputLabel id="designation-dept">Department</InputLabel>
            <Select
              labelId="designation-dept"
              label="Department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {departments.map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.name} ({row.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Default role code"
            value={defaultRoleCode}
            onChange={(e) => setDefaultRoleCode(e.target.value.toUpperCase())}
            disabled={busy}
            helperText="Optional login role code, e.g. SITE_ENGINEER"
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={mobileEligible}
                onChange={(e) => setMobileEligible(e.target.checked)}
                disabled={busy}
              />
            }
            label="Mobile eligible"
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? (
              <CircularProgress size={20} color="inherit" />
            ) : editing ? (
              'Save'
            ) : (
              'Create'
            )}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}
