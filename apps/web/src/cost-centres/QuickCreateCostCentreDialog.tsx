import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage, isConflictError } from '@/api/errors';
import { createCostCentre, fetchCostCentres } from './api';
import { costCentreKindLabel } from './labels';
import { suggestCostCentreCode } from './suggestCostCentreCode';
import {
  CostCentreKind,
  type CostCentreKind as CostCentreKindValue,
  type CostCentreListRow,
  type PublicCostCentre,
} from './types';

type Props = {
  open: boolean;
  kind: CostCentreKindValue;
  projectId?: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  onClose: () => void;
  onCreated: (row: CostCentreListRow) => void | Promise<void>;
};

function toListRow(row: PublicCostCentre): CostCentreListRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    projectId: row.projectId,
    status: row.status,
    createdAt: row.createdAt,
  };
}

/**
 * Quick-create cost / profit centre.
 * Code format: LUX-{year}-{projectShort}-{CC|PC}-{nnn} (auto-filled).
 * Requires `cost_centre.manage`.
 */
export function QuickCreateCostCentreDialog({
  open,
  kind,
  projectId,
  projectCode,
  projectName,
  onClose,
  onCreated,
}: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [scopeToProject, setScopeToProject] = useState(Boolean(projectId));
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knownCodes, setKnownCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setNotes('');
    setScopeToProject(Boolean(projectId));
    setCodeTouched(false);
    setError(null);
    setSaving(false);

    let cancelled = false;
    setLoadingCode(true);
    void (async () => {
      try {
        const list = await fetchCostCentres({ page: 1, limit: 200 });
        if (cancelled) return;
        const codes = list.items.map((row) => row.code);
        setKnownCodes(codes);
        setCode(
          suggestCostCentreCode({
            projectName,
            projectCode,
            kind,
            existingCodes: codes,
          }),
        );
      } catch {
        if (cancelled) return;
        setKnownCodes([]);
        setCode(
          suggestCostCentreCode({
            projectName,
            projectCode,
            kind,
            existingCodes: [],
          }),
        );
      } finally {
        if (!cancelled) setLoadingCode(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, kind, projectCode, projectId, projectName]);

  const title =
    kind === CostCentreKind.ProfitCentre
      ? 'Add profit centre'
      : 'Add cost centre';

  const close = () => {
    if (saving) return;
    onClose();
  };

  const refillAutoCode = (existing: readonly string[], sequence?: number) => {
    const next = suggestCostCentreCode({
      projectName,
      projectCode,
      kind,
      existingCodes: existing,
      sequence,
    });
    setCode(next);
    setCodeTouched(false);
  };

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    if (!trimmedCode) {
      setError('Code is required');
      return;
    }
    if (!/^[A-Za-z0-9_-]+$/.test(trimmedCode)) {
      setError('Code must be alphanumeric (underscore/hyphen allowed)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createCostCentre({
        code: trimmedCode,
        name: trimmedName,
        kind,
        projectId: scopeToProject && projectId ? projectId : null,
        notes: notes.trim() || null,
      });
      await onCreated(toListRow(created));
      onClose();
    } catch (err) {
      if (isConflictError(err)) {
        const nextCodes = [...knownCodes, trimmedCode];
        setKnownCodes(nextCodes);
        refillAutoCode(nextCodes);
        setError(
          `${getErrorMessage(err)}. Suggested the next code — review and Create again.`,
        );
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      data-testid="quick-create-cost-centre-dialog"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Creates an active {costCentreKindLabel(kind).toLowerCase()} in
            Accounting masters. You can also manage the full list under
            Accounting → Cost centres.
          </Typography>
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoFocus
            helperText={
              kind === CostCentreKind.ProfitCentre
                ? 'Example: Madambakkam project P&L'
                : 'Example: Footing'
            }
            fullWidth
          />
          <TextField
            label="Code"
            value={code}
            onChange={(event) => {
              setCodeTouched(true);
              setCode(event.target.value.toUpperCase());
            }}
            required
            disabled={loadingCode}
            helperText={
              codeTouched
                ? 'Custom code. Format is normally LUX-year-project-CC|PC-number.'
                : kind === CostCentreKind.ProfitCentre
                  ? 'Auto: LUX-{year}-{project}-PC-{number} (e.g. LUX-2026-MADAMB-PC-001)'
                  : 'Auto: LUX-{year}-{project}-CC-{number} (e.g. LUX-2026-MADAMB-CC-001)'
            }
            fullWidth
          />
          {projectId ? (
            <FormControlLabel
              control={
                <Switch
                  checked={scopeToProject}
                  onChange={(_, checked) => setScopeToProject(checked)}
                />
              }
              label="Limit to this project"
            />
          ) : null}
          <TextField
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          {error ? <Alert severity="warning">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={saving || loadingCode}
        >
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
