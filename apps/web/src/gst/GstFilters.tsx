import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { ProjectOption } from '@luxaria/shared-types';
import {
  gstDirectionLabel,
  gstDocumentStatusLabel,
  gstDocumentTypeLabel,
  gstReturnTypeLabel,
} from './labels';
import {
  GstDirection,
  GstDocumentStatus,
  GstDocumentType,
  GstReturnType,
  type GstDirection as Dir,
  type GstDocumentStatus as DocStatus,
  type GstDocumentType as DocType,
  type GstReturnType as RetType,
} from './types';

export type GstDocumentFilterState = {
  projectId: string;
  direction: Dir | '';
  status: DocStatus | '';
  documentType: DocType | '';
  from: string;
  to: string;
};

export type GstReturnFilterState = {
  returnType: RetType | '';
  periodMonth: string;
  periodYear: string;
};

type DocumentProps = {
  value: GstDocumentFilterState;
  onChange: (next: GstDocumentFilterState) => void;
  projects: readonly ProjectOption[];
};

export function GstDocumentFilters({ value, onChange, projects }: DocumentProps) {
  const patch = (partial: Partial<GstDocumentFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="gst-doc-project">Project</InputLabel>
        <Select
          labelId="gst-doc-project"
          label="Project"
          value={value.projectId}
          onChange={(e) => patch({ projectId: e.target.value })}
        >
          <MenuItem value="">
            <em>All projects</em>
          </MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.projectCode ? `${p.projectCode} · ${p.projectName}` : p.projectName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel id="gst-direction">Direction</InputLabel>
        <Select
          labelId="gst-direction"
          label="Direction"
          value={value.direction}
          onChange={(e) => patch({ direction: e.target.value as Dir | '' })}
        >
          <MenuItem value="">
            <em>All</em>
          </MenuItem>
          {Object.values(GstDirection).map((d) => (
            <MenuItem key={d} value={d}>
              {gstDirectionLabel(d)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="gst-doc-type">Document type</InputLabel>
        <Select
          labelId="gst-doc-type"
          label="Document type"
          value={value.documentType}
          onChange={(e) => patch({ documentType: e.target.value as DocType | '' })}
        >
          <MenuItem value="">
            <em>All types</em>
          </MenuItem>
          {Object.values(GstDocumentType).map((t) => (
            <MenuItem key={t} value={t}>
              {gstDocumentTypeLabel(t)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel id="gst-doc-status">Status</InputLabel>
        <Select
          labelId="gst-doc-status"
          label="Status"
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as DocStatus | '' })}
        >
          <MenuItem value="">
            <em>All statuses</em>
          </MenuItem>
          {Object.values(GstDocumentStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {gstDocumentStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="From"
        type="date"
        slotProps={{ inputLabel: { shrink: true } }}
        value={value.from}
        onChange={(e) => patch({ from: e.target.value })}
      />
      <TextField
        size="small"
        label="To"
        type="date"
        slotProps={{ inputLabel: { shrink: true } }}
        value={value.to}
        onChange={(e) => patch({ to: e.target.value })}
      />
    </Stack>
  );
}

type ReturnProps = {
  value: GstReturnFilterState;
  onChange: (next: GstReturnFilterState) => void;
};

export function GstReturnFilters({ value, onChange }: ReturnProps) {
  const patch = (partial: Partial<GstReturnFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="gst-return-type">Return type</InputLabel>
        <Select
          labelId="gst-return-type"
          label="Return type"
          value={value.returnType}
          onChange={(e) => patch({ returnType: e.target.value as RetType | '' })}
        >
          <MenuItem value="">
            <em>All types</em>
          </MenuItem>
          {Object.values(GstReturnType).map((t) => (
            <MenuItem key={t} value={t}>
              {gstReturnTypeLabel(t)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Month"
        type="number"
        value={value.periodMonth}
        onChange={(e) => patch({ periodMonth: e.target.value })}
        sx={{ width: 100 }}
      />
      <TextField
        size="small"
        label="Year"
        type="number"
        value={value.periodYear}
        onChange={(e) => patch({ periodYear: e.target.value })}
        sx={{ width: 110 }}
      />
    </Stack>
  );
}
