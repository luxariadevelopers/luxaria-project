import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { BOQ_ITEM_STATUS_OPTIONS } from './labels';
import type { BoqFilterState, BoqHierarchyBlock } from './types';

type Props = {
  value: BoqFilterState;
  tree: readonly BoqHierarchyBlock[];
  onChange: (next: BoqFilterState) => void;
};

export function BoqFilters({ value, tree, onChange }: Props) {
  const blocks = tree;
  const floors = value.blockId
    ? (blocks.find((b) => b.id === value.blockId)?.floors ?? [])
    : blocks.flatMap((b) => b.floors);
  const categories = value.floorId
    ? (floors.find((f) => f.id === value.floorId)?.workCategories ?? [])
    : floors.flatMap((f) => f.workCategories);

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { md: 'center' } }}
      data-testid="boq-filters"
    >
      <TextField
        size="small"
        label="Search"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        sx={{ minWidth: 200, flex: 1 }}
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="boq-block-filter">Block</InputLabel>
        <Select
          labelId="boq-block-filter"
          label="Block"
          value={value.blockId}
          onChange={(e) =>
            onChange({
              ...value,
              blockId: e.target.value,
              floorId: '',
              workCategoryId: '',
            })
          }
        >
          <MenuItem value="">All blocks</MenuItem>
          {blocks.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.blockCode} · {b.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="boq-floor-filter">Floor</InputLabel>
        <Select
          labelId="boq-floor-filter"
          label="Floor"
          value={value.floorId}
          onChange={(e) =>
            onChange({
              ...value,
              floorId: e.target.value,
              workCategoryId: '',
            })
          }
        >
          <MenuItem value="">All floors</MenuItem>
          {floors.map((f) => (
            <MenuItem key={f.id} value={f.id}>
              {f.floorCode} · {f.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="boq-category-filter">Work category</InputLabel>
        <Select
          labelId="boq-category-filter"
          label="Work category"
          value={value.workCategoryId}
          onChange={(e) =>
            onChange({ ...value, workCategoryId: e.target.value })
          }
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.categoryCode} · {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="boq-status-filter">Status</InputLabel>
        <Select
          labelId="boq-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as BoqFilterState['status'],
            })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {BOQ_ITEM_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
