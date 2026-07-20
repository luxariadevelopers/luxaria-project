import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { DocumentStatus } from '@luxaria/shared-types';
import type { ProjectOption } from '@luxaria/shared-types';
import {
  DOCUMENT_STATUS_FILTERS,
  type DocumentLibraryFilterState,
} from './validateLibraryFilters';

type Props = {
  value: DocumentLibraryFilterState;
  onChange: (next: DocumentLibraryFilterState) => void;
  projects: readonly ProjectOption[];
  fieldErrors?: Partial<Record<keyof DocumentLibraryFilterState, string>>;
};

const STATUS_LABELS: Record<(typeof DOCUMENT_STATUS_FILTERS)[number], string> =
  {
    [DocumentStatus.PendingUpload]: 'Pending upload',
    [DocumentStatus.Active]: 'Active',
    [DocumentStatus.Replaced]: 'Replaced',
    [DocumentStatus.Archived]: 'Archived',
  };

export function DocumentLibraryFilters({
  value,
  onChange,
  projects,
  fieldErrors = {},
}: Props) {
  return (
    <Stack spacing={1.5}>
      <Alert severity="info" variant="outlined">
        Nest lists documents per entity (`entityType` + `entityId` required).
        Search filters the loaded page client-side. Download uses short-lived
        private URLs — S3 keys are never shown.
      </Alert>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ flexWrap: 'wrap', alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <TextField
          size="small"
          label="Entity type"
          required
          value={value.entityType}
          error={Boolean(fieldErrors.entityType)}
          helperText={fieldErrors.entityType ?? 'e.g. project'}
          onChange={(e) => onChange({ ...value, entityType: e.target.value })}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          label="Entity id"
          required
          value={value.entityId}
          error={Boolean(fieldErrors.entityId)}
          helperText={fieldErrors.entityId ?? '24-character ObjectId'}
          onChange={(e) => onChange({ ...value, entityId: e.target.value })}
          sx={{ minWidth: 220 }}
        />
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
          <InputLabel id="doc-lib-project">Project</InputLabel>
          <Select
            labelId="doc-lib-project"
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="doc-lib-status">Status</InputLabel>
          <Select
            labelId="doc-lib-status"
            label="Status"
            value={value.status}
            error={Boolean(fieldErrors.status)}
            onChange={(e) => onChange({ ...value, status: e.target.value })}
          >
            <MenuItem value="">
              <em>Active + pending (API default)</em>
            </MenuItem>
            {DOCUMENT_STATUS_FILTERS.map((status) => (
              <MenuItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Search"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Name, code, type…"
          sx={{ minWidth: 180 }}
        />
      </Stack>
    </Stack>
  );
}
