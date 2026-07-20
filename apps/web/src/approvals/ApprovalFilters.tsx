import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import {
  approvalStatusCatalog,
  type ProjectOption,
} from '@luxaria/shared-types';
import {
  APPROVAL_AGEING_FILTERS,
  APPROVAL_STATUS_FILTERS,
  type ApprovalInboxFilterState,
} from './validateFilters';

export type ApprovalFilterState = ApprovalInboxFilterState;

type Props = {
  value: ApprovalInboxFilterState;
  onChange: (next: ApprovalInboxFilterState) => void;
  /** Accessible projects from ProjectContext (selector list). */
  projects: readonly ProjectOption[];
  /** Distinct modules from the current result set (optional hints). */
  moduleOptions?: readonly string[];
  fieldErrors?: Partial<Record<keyof ApprovalInboxFilterState, string>>;
  /** Shown when amount/ageing filters force a capped client pass. */
  clientFilterHint?: string | null;
};

const AGEING_LABELS: Record<(typeof APPROVAL_AGEING_FILTERS)[number], string> =
  {
    fresh: 'Fresh (today)',
    aging: 'Aging (1–2d)',
    stale: 'Stale (3d+)',
    escalated: 'Escalated',
  };

export function ApprovalFilters({
  value,
  onChange,
  projects,
  moduleOptions = [],
  fieldErrors = {},
  clientFilterHint,
}: Props) {
  return (
    <Stack spacing={1.5}>
      {clientFilterHint ? (
        <Alert severity="info" variant="outlined">
          {clientFilterHint}
        </Alert>
      ) : null}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, flexWrap: 'wrap' }}
      >
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="approval-project-filter">Project</InputLabel>
          <Select
            labelId="approval-project-filter"
            label="Project"
            value={value.projectId}
            error={Boolean(fieldErrors.projectId)}
            onChange={(e) =>
              onChange({ ...value, projectId: String(e.target.value) })
            }
          >
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.projectCode}
                {p.projectName ? ` · ${p.projectName}` : ''}
              </MenuItem>
            ))}
            {value.projectId &&
            !projects.some((p) => p.id === value.projectId) ? (
              <MenuItem value={value.projectId}>{value.projectId}</MenuItem>
            ) : null}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="approval-status-filter">Status</InputLabel>
          <Select
            labelId="approval-status-filter"
            label="Status"
            value={value.status}
            error={Boolean(fieldErrors.status)}
            onChange={(e) => onChange({ ...value, status: e.target.value })}
          >
            <MenuItem value="">
              <em>All statuses</em>
            </MenuItem>
            {APPROVAL_STATUS_FILTERS.map((status) => (
              <MenuItem key={status} value={status}>
                {approvalStatusCatalog.label(status)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="approval-module-filter">Module</InputLabel>
          <Select
            labelId="approval-module-filter"
            label="Module"
            value={value.module}
            error={Boolean(fieldErrors.module)}
            onChange={(e) => onChange({ ...value, module: e.target.value })}
          >
            <MenuItem value="">
              <em>All modules</em>
            </MenuItem>
            {moduleOptions.map((module) => (
              <MenuItem key={module} value={module}>
                {module}
              </MenuItem>
            ))}
            {value.module && !moduleOptions.includes(value.module) ? (
              <MenuItem value={value.module}>{value.module}</MenuItem>
            ) : null}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Entity type"
          value={value.entityType}
          error={Boolean(fieldErrors.entityType)}
          helperText={fieldErrors.entityType}
          onChange={(e) => onChange({ ...value, entityType: e.target.value })}
          sx={{ minWidth: 160 }}
        />

        <TextField
          size="small"
          label="Min amount"
          value={value.minAmount}
          error={Boolean(fieldErrors.minAmount)}
          helperText={fieldErrors.minAmount}
          onChange={(e) => onChange({ ...value, minAmount: e.target.value })}
          sx={{ minWidth: 120 }}
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        />

        <TextField
          size="small"
          label="Max amount"
          value={value.maxAmount}
          error={Boolean(fieldErrors.maxAmount)}
          helperText={fieldErrors.maxAmount}
          onChange={(e) => onChange({ ...value, maxAmount: e.target.value })}
          sx={{ minWidth: 120 }}
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="approval-ageing-filter">Ageing</InputLabel>
          <Select
            labelId="approval-ageing-filter"
            label="Ageing"
            value={value.ageing}
            error={Boolean(fieldErrors.ageing)}
            onChange={(e) => onChange({ ...value, ageing: e.target.value })}
          >
            <MenuItem value="">
              <em>Any ageing</em>
            </MenuItem>
            {APPROVAL_AGEING_FILTERS.map((level) => (
              <MenuItem key={level} value={level}>
                {AGEING_LABELS[level]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {fieldErrors.status || fieldErrors.ageing || fieldErrors.projectId ? (
        <Alert severity="warning" variant="outlined">
          {[
            fieldErrors.status,
            fieldErrors.ageing,
            fieldErrors.projectId,
            fieldErrors.module,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Alert>
      ) : null}
    </Stack>
  );
}
