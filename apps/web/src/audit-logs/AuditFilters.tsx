import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { AUDIT_ACTIONS, labelTimelineAction } from '@luxaria/shared-types';
import type { ProjectOption } from '@luxaria/shared-types';
import type { AuditLogFilterState } from './validateFilters';

type Props = {
  value: AuditLogFilterState;
  onChange: (next: AuditLogFilterState) => void;
  projects: readonly ProjectOption[];
  fieldErrors?: Partial<Record<keyof AuditLogFilterState, string>>;
};

export function AuditFilters({
  value,
  onChange,
  projects,
  fieldErrors = {},
}: Props) {
  return (
    <Stack spacing={1.5}>
      <Alert severity="info" variant="outlined">
        Immutable audit trail (read-only). Sensitive fields are masked by Nest
        and re-masked in the UI — masked values are never rehydrated.
      </Alert>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <TextField
          size="small"
          label="Actor (user id)"
          value={value.userId}
          error={Boolean(fieldErrors.userId)}
          helperText={fieldErrors.userId ?? 'ObjectId filter'}
          onChange={(e) => onChange({ ...value, userId: e.target.value })}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="audit-action-filter">Action</InputLabel>
          <Select
            labelId="audit-action-filter"
            label="Action"
            value={value.action}
            error={Boolean(fieldErrors.action)}
            onChange={(e) => onChange({ ...value, action: e.target.value })}
          >
            <MenuItem value="">
              <em>All actions</em>
            </MenuItem>
            {AUDIT_ACTIONS.map((action) => (
              <MenuItem key={action} value={action}>
                {labelTimelineAction(action)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Module"
          value={value.module}
          error={Boolean(fieldErrors.module)}
          helperText={fieldErrors.module}
          onChange={(e) => onChange({ ...value, module: e.target.value })}
          sx={{ minWidth: 140 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="audit-project-filter">Project</InputLabel>
          <Select
            labelId="audit-project-filter"
            label="Project"
            value={value.projectId}
            error={Boolean(fieldErrors.projectId)}
            onChange={(e) =>
              onChange({ ...value, projectId: String(e.target.value) })
            }
          >
            <MenuItem value="">
              <em>Any project</em>
            </MenuItem>
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.projectCode}
                {p.projectName ? ` · ${p.projectName}` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Entity type"
          value={value.entityType}
          error={Boolean(fieldErrors.entityType)}
          helperText={fieldErrors.entityType}
          onChange={(e) => onChange({ ...value, entityType: e.target.value })}
          sx={{ minWidth: 140 }}
        />
        <TextField
          size="small"
          label="Entity id"
          value={value.entityId}
          onChange={(e) => onChange({ ...value, entityId: e.target.value })}
          sx={{ minWidth: 180 }}
        />
        <TextField
          size="small"
          label="From"
          type="datetime-local"
          value={toLocalInput(value.from)}
          error={Boolean(fieldErrors.from)}
          helperText={fieldErrors.from}
          onChange={(e) =>
            onChange({ ...value, from: fromLocalInput(e.target.value) })
          }
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 200 }}
        />
        <TextField
          size="small"
          label="To"
          type="datetime-local"
          value={toLocalInput(value.to)}
          error={Boolean(fieldErrors.to)}
          helperText={fieldErrors.to}
          onChange={(e) =>
            onChange({ ...value, to: fromLocalInput(e.target.value) })
          }
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 200 }}
        />
      </Stack>
    </Stack>
  );
}

/** Convert ISO → `datetime-local` value. */
function toLocalInput(iso: string): string {
  if (!iso.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  if (!local.trim()) return '';
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return local;
  return d.toISOString();
}
