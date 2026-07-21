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
  tdsDeductionStatusLabel,
  tdsFormTypeLabel,
  tdsQuarterLabel,
  tdsReturnStatusLabel,
} from './labels';
import {
  TdsDeductionStatus,
  TdsFormType,
  TdsQuarter,
  TdsReturnStatus,
  type TdsDeductionStatus as DedStatus,
  type TdsFormType as FormType,
  type TdsQuarter as Quarter,
  type TdsReturnStatus as RetStatus,
} from './types';

export type TdsDeductionFilterState = {
  projectId: string;
  sectionCode: string;
  status: DedStatus | '';
  from: string;
  to: string;
};

export type TdsReturnFilterState = {
  formType: FormType | '';
  quarter: Quarter | '';
  financialYearLabel: string;
  status: RetStatus | '';
};

export function TdsDeductionFilters({
  value,
  onChange,
  projects,
}: {
  value: TdsDeductionFilterState;
  onChange: (next: TdsDeductionFilterState) => void;
  projects: readonly ProjectOption[];
}) {
  const patch = (partial: Partial<TdsDeductionFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="tds-project">Project</InputLabel>
        <Select
          labelId="tds-project"
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
      <TextField
        size="small"
        label="Section"
        value={value.sectionCode}
        onChange={(e) => patch({ sectionCode: e.target.value })}
        sx={{ width: 120 }}
      />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="tds-ded-status">Status</InputLabel>
        <Select
          labelId="tds-ded-status"
          label="Status"
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as DedStatus | '' })}
        >
          <MenuItem value="">
            <em>All statuses</em>
          </MenuItem>
          {Object.values(TdsDeductionStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {tdsDeductionStatusLabel(s)}
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

export function TdsReturnFilters({
  value,
  onChange,
}: {
  value: TdsReturnFilterState;
  onChange: (next: TdsReturnFilterState) => void;
}) {
  const patch = (partial: Partial<TdsReturnFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="tds-form">Form</InputLabel>
        <Select
          labelId="tds-form"
          label="Form"
          value={value.formType}
          onChange={(e) => patch({ formType: e.target.value as FormType | '' })}
        >
          <MenuItem value="">
            <em>All forms</em>
          </MenuItem>
          {Object.values(TdsFormType).map((f) => (
            <MenuItem key={f} value={f}>
              {tdsFormTypeLabel(f)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel id="tds-quarter">Quarter</InputLabel>
        <Select
          labelId="tds-quarter"
          label="Quarter"
          value={value.quarter}
          onChange={(e) => patch({ quarter: e.target.value as Quarter | '' })}
        >
          <MenuItem value="">
            <em>All</em>
          </MenuItem>
          {Object.values(TdsQuarter).map((q) => (
            <MenuItem key={q} value={q}>
              {tdsQuarterLabel(q)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="FY label"
        value={value.financialYearLabel}
        onChange={(e) => patch({ financialYearLabel: e.target.value })}
        sx={{ width: 120 }}
      />
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="tds-ret-status">Status</InputLabel>
        <Select
          labelId="tds-ret-status"
          label="Status"
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as RetStatus | '' })}
        >
          <MenuItem value="">
            <em>All statuses</em>
          </MenuItem>
          {Object.values(TdsReturnStatus).map((s) => (
            <MenuItem key={s} value={s}>
              {tdsReturnStatusLabel(s)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
